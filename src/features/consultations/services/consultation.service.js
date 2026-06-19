import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class ConsultationService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async createConsultation(clinicId, data, diagnoses, prescriptions, investigations, userId) {
        const { data: consultation, error: consultError } = await this.supabase
            .from("consultations")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                doctor_id: userId,
                appointment_id: data.appointment_id || null,
                chief_complaint: data.chief_complaint || "",
                history_of_presenting_illness: data.history_of_presenting_illness || "",
                vital_signs: data.vital_signs || {},
                physical_examination: data.physical_examination || "",
                assessment: data.assessment || "",
                treatment_plan: data.treatment_plan || "",
                follow_up_instructions: data.follow_up_instructions || "",
                follow_up_date: data.follow_up_date || null,
                sick_leave_days: data.sick_leave_days || 0,
                status: data.status || "in_progress",
                created_by: userId,
            })
            .select("id")
            .single();

        if (consultError) throw consultError;

        const consultationId = consultation.id;

        if (diagnoses?.length > 0) {
            const { error: diagError } = await this.supabase
                .from("diagnoses")
                .insert(diagnoses.map(d => ({
                    consultation_id: consultationId,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    icd_code: d.icd_code || null,
                    description: d.description,
                    type: d.type || "primary",
                    notes: d.notes || null,
                })));
            if (diagError) throw diagError;
        }

        if (prescriptions?.length > 0) {
            const { error: rxError } = await this.supabase
                .from("prescriptions")
                .insert(prescriptions.map(p => ({
                    consultation_id: consultationId,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    medicine_name: p.medicine_name,
                    strength: p.strength || null,
                    form: p.form || null,
                    dosage: p.dosage || null,
                    frequency: p.frequency || null,
                    duration: p.duration || null,
                    quantity: p.quantity || null,
                    route: p.route || null,
                    notes: p.notes || null,
                    created_by: userId,
                })));
            if (rxError) throw rxError;
        }

        if (investigations?.length > 0) {
            const { error: invError } = await this.supabase
                .from("investigations")
                .insert(investigations.map(i => ({
                    consultation_id: consultationId,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    test_name: i.test_name,
                    category: i.category || null,
                    instructions: i.instructions || null,
                    created_by: userId,
                })));
            if (invError) throw invError;
        }

        return consultationId;
    }

    async getConsultation(clinicId, id) {
        const { data, error } = await this.supabase
            .from("consultations")
            .select(`
                *,
                patients!inner(*),
                users!consultations_doctor_id_fkey(id, full_name, email),
                diagnoses(*),
                prescriptions(*),
                investigations(*)
            `)
            .eq("clinic_id", clinicId)
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    }

    async updateConsultation(clinicId, id, data, diagnoses, prescriptions, investigations, userId) {
        const { error: consultError } = await this.supabase
            .from("consultations")
            .update({
                chief_complaint: data.chief_complaint,
                history_of_presenting_illness: data.history_of_presenting_illness,
                vital_signs: data.vital_signs,
                physical_examination: data.physical_examination,
                assessment: data.assessment,
                treatment_plan: data.treatment_plan,
                follow_up_instructions: data.follow_up_instructions,
                follow_up_date: data.follow_up_date,
                sick_leave_days: data.sick_leave_days,
                status: data.status,
            })
            .eq("id", id)
            .eq("clinic_id", clinicId);

        if (consultError) throw consultError;

        if (data.status === "completed") {
            await this.supabase
                .from("appointments")
                .update({ status: "completed" })
                .eq("id", data.appointment_id)
                .eq("clinic_id", clinicId);
        }

        await this.supabase.from("diagnoses").delete().eq("consultation_id", id);
        if (diagnoses?.length > 0) {
            const { error: diagError } = await this.supabase
                .from("diagnoses")
                .insert(diagnoses.map(d => ({
                    consultation_id: id,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    icd_code: d.icd_code || null,
                    description: d.description,
                    type: d.type || "primary",
                    notes: d.notes || null,
                })));
            if (diagError) throw diagError;
        }

        await this.supabase.from("prescriptions").delete().eq("consultation_id", id);
        if (prescriptions?.length > 0) {
            const { error: rxError } = await this.supabase
                .from("prescriptions")
                .insert(prescriptions.map(p => ({
                    consultation_id: id,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    medicine_name: p.medicine_name,
                    strength: p.strength || null,
                    form: p.form || null,
                    dosage: p.dosage || null,
                    frequency: p.frequency || null,
                    duration: p.duration || null,
                    quantity: p.quantity || null,
                    route: p.route || null,
                    notes: p.notes || null,
                    created_by: userId,
                })));
            if (rxError) throw rxError;
        }

        await this.supabase.from("investigations").delete().eq("consultation_id", id);
        if (investigations?.length > 0) {
            const { error: invError } = await this.supabase
                .from("investigations")
                .insert(investigations.map(i => ({
                    consultation_id: id,
                    clinic_id: clinicId,
                    patient_id: data.patient_id,
                    test_name: i.test_name,
                    category: i.category || null,
                    instructions: i.instructions || null,
                    created_by: userId,
                })));
            if (invError) throw invError;
        }

        return id;
    }

    async completeConsultation(clinicId, id, data, diagnoses, prescriptions, investigations, userId) {
        return this.updateConsultation(
            clinicId, id,
            { ...data, status: "completed" },
            diagnoses, prescriptions, investigations, userId
        );
    }

    async getPatientVisits(clinicId, patientId) {
        const { data, error } = await this.supabase
            .from("consultations")
            .select(`
                id, created_at, chief_complaint, status,
                users!consultations_doctor_id_fkey(id, full_name),
                diagnoses(description, type),
                prescriptions(medicine_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getConsultationByAppointment(clinicId, appointmentId) {
        const { data, error } = await this.supabase
            .from("consultations")
            .select("id, status")
            .eq("clinic_id", clinicId)
            .eq("appointment_id", appointmentId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async deleteConsultation(clinicId, id) {
        const { error } = await this.supabase
            .from("consultations")
            .delete()
            .eq("id", id)
            .eq("clinic_id", clinicId);

        if (error) throw error;
    }
}

export function getConsultationService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new ConsultationService(supabase);
    return cachedService;
}
