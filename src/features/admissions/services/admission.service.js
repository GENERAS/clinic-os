import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class AdmissionService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async admitPatient(clinicId, data, userId) {
        const { data: admission, error } = await this.supabase
            .from("admissions")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                consultation_id: data.consultation_id || null,
                ward: data.ward,
                bed_number: data.bed_number || null,
                admission_reason: data.admission_reason || null,
                diagnosis: data.diagnosis || null,
                attending_doctor: data.attending_doctor || null,
                admitted_by: userId,
                status: "active",
            })
            .select("id")
            .single();
        if (error) throw error;
        return admission.id;
    }

    async getAdmissions(clinicId, status = null) {
        let query = this.supabase
            .from("admissions")
            .select(`
                *,
                patients(id, full_name, phone, gender, date_of_birth),
                doctor_user:users!admissions_attending_doctor_fkey(id, full_name),
                admitter:users!admissions_admitted_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);
        if (status && status !== "all") {
            query = query.eq("status", status);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(a => ({
            ...a,
            doctor_name: a.doctor_user?.full_name || "Unassigned",
            admitted_by_name: a.admitter?.full_name || "Unknown",
        }));
    }

    async getAdmission(clinicId, id) {
        const { data, error } = await this.supabase
            .from("admissions")
            .select(`
                *,
                patients(id, full_name, phone, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone),
                doctor_user:users!admissions_attending_doctor_fkey(id, full_name),
                admitter:users!admissions_admitted_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;

        const { data: vitals } = await this.supabase
            .from("admission_vitals")
            .select("*")
            .eq("admission_id", id)
            .order("recorded_at", { ascending: false });

        const { data: medications } = await this.supabase
            .from("admission_medications")
            .select("*")
            .eq("admission_id", id)
            .order("created_at", { ascending: false });

        return {
            ...data,
            doctor_name: data.doctor_user?.full_name || "Unassigned",
            admitted_by_name: data.admitter?.full_name || "Unknown",
            vitals: vitals || [],
            medications: medications || [],
        };
    }

    async dischargePatient(clinicId, id, data, userId) {
        const { error } = await this.supabase
            .from("admissions")
            .update({
                status: data.status || "discharged",
                discharge_date: new Date().toISOString(),
                discharge_summary: data.discharge_summary || null,
                discharge_instructions: data.discharge_instructions || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;

        // Deactivate all active medications
        await this.supabase
            .from("admission_medications")
            .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] })
            .eq("admission_id", id)
            .eq("is_active", true);
    }

    async addVitals(clinicId, admissionId, vitalSigns, notes, userId) {
        const { data, error } = await this.supabase
            .from("admission_vitals")
            .insert({
                admission_id: admissionId,
                clinic_id: clinicId,
                vital_signs: vitalSigns,
                notes: notes || null,
                recorded_by: userId,
            })
            .select("id")
            .single();
        if (error) throw error;
        return data.id;
    }

    async addMedication(clinicId, admissionId, medData, userId) {
        const { data, error } = await this.supabase
            .from("admission_medications")
            .insert({
                admission_id: admissionId,
                clinic_id: clinicId,
                medicine_name: medData.medicine_name,
                dosage: medData.dosage || null,
                frequency: medData.frequency || null,
                route: medData.route || null,
                start_date: medData.start_date || new Date().toISOString().split("T")[0],
                end_date: medData.end_date || null,
                prescribed_by: userId,
            })
            .select("id")
            .single();
        if (error) throw error;
        return data.id;
    }

    async getActiveAdmissions(clinicId) {
        const { data, error } = await this.supabase
            .from("admissions")
            .select(`
                *,
                patients(id, full_name, phone)
            `)
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .order("admission_date", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getWardOccupancy(clinicId) {
        const { data, error } = await this.supabase
            .from("admissions")
            .select("ward, bed_number, status")
            .eq("clinic_id", clinicId)
            .eq("status", "active");
        if (error) throw error;

        const wards = {};
        (data || []).forEach(a => {
            if (!wards[a.ward]) wards[a.ward] = { total_beds: 0, occupied: 0 };
            wards[a.ward].occupied++;
        });
        return wards;
    }
}

export function getAdmissionService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new AdmissionService(supabase);
    return cachedService;
}
