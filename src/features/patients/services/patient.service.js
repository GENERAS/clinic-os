import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { fetchUsers, enrichUser } from "@/lib/supabase/users";
export function getPatientService() {
    const supabase = createClient();
    const audit = getAuditService();
    const calcAge = (dob) => {
        const birth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate()))
            age--;
        return age;
    };
    return {
        async createPatient(clinicId, values, userId) {
            const { data: existing } = await supabase
                .from("patients")
                .select("id, full_name")
                .eq("clinic_id", clinicId)
                .eq("phone", values.phone)
                .maybeSingle();
            if (existing) {
                throw new Error(`PATIENT_EXISTS:${existing.id}:${existing.full_name}`);
            }
            const { data: patient, error } = await supabase
                .from("patients")
                .insert({
                clinic_id: clinicId,
                full_name: values.full_name,
                phone: values.phone,
                created_by: userId,
                date_of_birth: values.date_of_birth || null,
            })
                .select("id")
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "patient created",
                entity_type: "patients",
                entity_id: patient.id,
                new_value: { full_name: values.full_name, phone: values.phone },
            }).catch(() => { });
            return patient;
        },
        async getPatients(clinicId, search, options) {
            const page = options?.page || 0;
            const pageSize = options?.pageSize || 20;
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const baseQuery = supabase
                .from("patients")
                .select("id, full_name, phone, gender, created_at", { count: "exact" })
                .eq("clinic_id", clinicId);
            if (search) {
                const q = search.trim();
                if (q) {
                    baseQuery.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
                }
            }
            const { data, error, count } = await baseQuery
                .order("created_at", { ascending: false })
                .range(from, to);
            if (error) throw error;

            const patientIds = (data || []).map((r) => r.id).filter(Boolean);
            let appointmentMap = new Map();
            if (patientIds.length > 0) {
                const { data: appts } = await supabase
                    .from("appointments")
                    .select("patient_id, appointment_date, status")
                    .eq("clinic_id", clinicId)
                    .in("patient_id", patientIds);
                (appts || []).forEach((a) => {
                    if (!appointmentMap.has(a.patient_id)) appointmentMap.set(a.patient_id, []);
                    appointmentMap.get(a.patient_id).push(a);
                });
            }

            const patients = (data || []).map((row) => {
                const appointments = appointmentMap.get(row.id) || [];
                const sorted = [...appointments].sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1));
                const completed = sorted.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
                const today = new Date().toISOString().split("T")[0] || "";
                const upcoming = sorted.find((a) => {
                    const dateStr = a.appointment_date;
                    return dateStr >= today && a.status !== "cancelled" && a.status !== "no_show" && a.status !== "completed";
                });
                return {
                    id: row.id,
                    full_name: row.full_name,
                    phone: row.phone,
                    gender: row.gender,
                    total_visits: completed.length,
                    last_visit_date: completed[0]?.appointment_date ?? null,
                    upcoming_appointment: upcoming?.appointment_date || null,
                    created_at: row.created_at,
                };
            });
            return { data: patients, total: count || 0 };
        },
        async searchPatients(clinicId, query) {
            if (!query || query.trim().length < 2)
                return [];
            const q = query.trim();
            const { data, error } = await supabase
                .from("patients")
                .select("id, full_name, phone, gender")
                .eq("clinic_id", clinicId)
                .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
                .limit(10);
            if (error)
                throw error;
            return (data || []);
        },
        async getPatientById(clinicId, patientId) {
            const { data, error } = await supabase
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .eq("clinic_id", clinicId)
                .single();
            if (error || !data)
                return null;
            const { data: appointments } = await supabase
                .from("appointments")
                .select("appointment_date, status, start_time")
                .eq("clinic_id", clinicId)
                .eq("patient_id", patientId)
                .order("appointment_date", { ascending: false })
                .limit(50);
            const total = appointments?.length || 0;
            const sorted = [...(appointments || [])].sort((a, b) => a.appointment_date < b.appointment_date ? 1 : -1);
            const completed = sorted.filter((a) => a.status !== "cancelled" && a.status !== "no_show" && a.status === "completed");
            const today = new Date().toISOString().split("T")[0] || "";
            const upcoming = sorted.find((a) => a.appointment_date >= today && a.status !== "cancelled" && a.status !== "no_show" && a.status !== "completed");
            const patient = data;
            return {
                ...patient,
                age: patient.date_of_birth ? calcAge(patient.date_of_birth) : null,
                total_appointments: total,
                last_appointment: completed[0]
                    ? { appointment_date: completed[0].appointment_date, status: completed[0].status }
                    : null,
                upcoming_appointment: upcoming
                    ? { appointment_date: upcoming.appointment_date, start_time: upcoming.start_time, status: upcoming.status }
                    : null,
            };
        },
        async updatePatient(clinicId, patientId, values, userId) {
            if (values.phone) {
                const { data: existing } = await supabase
                    .from("patients")
                    .select("id, full_name")
                    .eq("clinic_id", clinicId)
                    .eq("phone", values.phone)
                    .neq("id", patientId)
                    .maybeSingle();
                if (existing) {
                    throw new Error(`PATIENT_EXISTS:${existing.id}:${existing.full_name}`);
                }
            }
            const { data, error } = await supabase
                .from("patients")
                .update({ ...values, updated_at: new Date().toISOString() })
                .eq("id", patientId)
                .eq("clinic_id", clinicId)
                .select()
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "patient updated",
                entity_type: "patients",
                entity_id: patientId,
                new_value: values,
            }).catch(() => { });
            return data;
        },
        async getPatientAppointments(clinicId, patientId, page, pageSize) {
            const p = page || 0;
            const ps = pageSize || 20;
            const from = p * ps;
            const to = from + ps - 1;
            const { data, error, count } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("patient_id", patientId)
                .order("appointment_date", { ascending: false })
                .order("start_time", { ascending: false })
                .range(from, to);
            if (error) throw error;
            const ids = (data || []).map((r) => r.doctor_id).filter(Boolean);
            await fetchUsers(clinicId, ids);
            const enriched = (data || []).map((r) => ({
                ...r,
                doctor: enrichUser(r.doctor_id),
                doctor_name: enrichUser(r.doctor_id)?.full_name || "",
            }));
            return { data: enriched || [], total: count || 0 };
        },
        async addPatientNote(clinicId, patientId, content, userId) {
            const { data, error } = await supabase
                .from("patient_notes")
                .insert({
                clinic_id: clinicId,
                patient_id: patientId,
                author_id: userId,
                content,
            })
                .select()
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "patient note added",
                entity_type: "patient_notes",
                entity_id: data.id,
                new_value: { patient_id: patientId },
            }).catch(() => { });
            return data;
        },
        async getPatientNotes(clinicId, patientId) {
            const { data, error } = await supabase
                .from("patient_notes")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("patient_id", patientId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            const ids = (data || []).map((r) => r.author_id).filter(Boolean);
            await fetchUsers(clinicId, ids);
            return (data || []).map((row) => ({
                id: row.id,
                clinic_id: row.clinic_id,
                patient_id: row.patient_id,
                author_id: row.author_id,
                content: row.content,
                created_at: row.created_at,
                author_name: enrichUser(row.author_id)?.full_name || "Unknown",
            }));
        },
    };
}
