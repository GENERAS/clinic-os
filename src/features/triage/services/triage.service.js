import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class TriageService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async createTriage(clinicId, data, userId) {
        const { data: record, error } = await this.supabase
            .from("triage_records")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                appointment_id: data.appointment_id || null,
                chief_complaint: data.chief_complaint || "",
                vital_signs: data.vital_signs || {},
                allergies: data.allergies || "",
                current_medications: data.current_medications || "",
                urgency_level: data.urgency_level || "routine",
                triage_note: data.triage_note || "",
                status: "waiting",
                triaged_by: userId,
            })
            .select("id")
            .single();

        if (error) throw error;
        return record.id;
    }

    async getTriageQueue(clinicId) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select(`
                *,
                patients!inner(id, full_name, phone, date_of_birth, gender),
                users!triage_records_triaged_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .in("status", ["waiting", "in_consultation"])
            .order("urgency_level", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getCompletedTriage(clinicId, limit = 20) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select(`
                *,
                patients!inner(id, full_name, phone),
                users!triage_records_triaged_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    async getTriageById(clinicId, triageId) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("id", triageId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async getTriageByAppointment(clinicId, appointmentId) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("appointment_id", appointmentId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async getTriageByPatient(clinicId, patientId) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select(`
                *,
                users!triage_records_triaged_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async updateTriageStatus(clinicId, id, status, consultationId = null) {
        const updateData = { status };
        if (consultationId) updateData.consultation_id = consultationId;

        const { error } = await this.supabase
            .from("triage_records")
            .update(updateData)
            .eq("id", id)
            .eq("clinic_id", clinicId);

        if (error) throw error;
    }

    async getTriageCounts(clinicId) {
        const { data, error } = await this.supabase
            .from("triage_records")
            .select("status, urgency_level")
            .eq("clinic_id", clinicId);

        if (error) throw error;
        const records = data || [];
        return {
            waiting: records.filter(r => r.status === "waiting").length,
            inConsultation: records.filter(r => r.status === "in_consultation").length,
            emergency: records.filter(r => r.urgency_level === "emergency").length,
            urgent: records.filter(r => r.urgency_level === "urgent").length,
            total: records.length,
        };
    }
}

export function getTriageService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new TriageService(supabase);
    return cachedService;
}
