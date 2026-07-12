import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class RadiologyService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getOrders(clinicId, filters = {}) {
        let query = this.supabase
            .from("radiology_orders")
            .select(`
                *,
                patients(id, full_name, phone, date_of_birth, gender),
                users!radiology_orders_ordered_by_fkey(id, full_name),
                users!radiology_orders_assigned_radiologist_id_fkey(id, full_name),
                consultations(id, chief_complaint),
                radiology_images(id, file_url, file_name, mime_type),
                radiology_reports(id, status, findings, impression, radiologist_id, created_at)
            `)
            .eq("clinic_id", clinicId);

        if (filters.status) query = query.eq("status", filters.status);
        if (filters.modality) query = query.eq("modality", filters.modality);
        if (filters.patientId) query = query.eq("patient_id", filters.patientId);
        if (filters.pendingOnly) query = query.in("status", ["ordered", "scheduled", "imaging_done"]);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getOrder(clinicId, orderId) {
        const { data, error } = await this.supabase
            .from("radiology_orders")
            .select(`
                *,
                patients(id, full_name, phone, date_of_birth, gender, address),
                users!radiology_orders_ordered_by_fkey(id, full_name, email),
                users!radiology_orders_assigned_radiologist_id_fkey(id, full_name, email),
                consultations(id, chief_complaint, history_of_presenting_illness, diagnosis, treatment_plan),
                radiology_images(*),
                radiology_reports(*, users!radiology_reports_radiologist_id_fkey(id, full_name, email))
            `)
            .eq("id", orderId)
            .eq("clinic_id", clinicId)
            .single();

        if (error) throw error;
        return data;
    }

    async createOrder(clinicId, orderData, userId) {
        const { data, error } = await this.supabase
            .from("radiology_orders")
            .insert({
                clinic_id: clinicId,
                patient_id: orderData.patient_id,
                consultation_id: orderData.consultation_id || null,
                appointment_id: orderData.appointment_id || null,
                modality: orderData.modality,
                body_part: orderData.body_part,
                clinical_indication: orderData.clinical_indication,
                urgency: orderData.urgency || "routine",
                special_instructions: orderData.special_instructions || null,
                ordered_by: userId,
                created_by: userId,
                status: "ordered",
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateOrder(clinicId, orderId, updates) {
        const { error } = await this.supabase
            .from("radiology_orders")
            .update(updates)
            .eq("id", orderId)
            .eq("clinic_id", clinicId);

        if (error) throw error;
    }

    async transitionStatus(clinicId, orderId, newStatus, userId) {
        const updates = { status: newStatus };
        if (newStatus === "imaging_done") updates.performed_at = new Date().toISOString();
        if (newStatus === "completed") updates.completed_at = new Date().toISOString();
        if (newStatus === "scheduled") updates.assigned_radiologist_id = userId;

        await this.updateOrder(clinicId, orderId, updates);
    }

    async uploadImage(clinicId, orderId, file, userId) {
        const ext = file.name.split(".").pop();
        const path = `${clinicId}/${orderId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await this.supabase.storage
            .from("radiology-images")
            .upload(path, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = this.supabase.storage
            .from("radiology-images")
            .getPublicUrl(path);

        const { data, error } = await this.supabase
            .from("radiology_images")
            .insert({
                order_id: orderId,
                clinic_id: clinicId,
                file_url: urlData.publicUrl,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                storage_path: path,
                uploaded_by: userId,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteImage(clinicId, imageId, storagePath) {
        if (storagePath) {
            await this.supabase.storage.from("radiology-images").remove([storagePath]);
        }
        const { error } = await this.supabase
            .from("radiology_images")
            .delete()
            .eq("id", imageId)
            .eq("clinic_id", clinicId);

        if (error) throw error;
    }

    async saveReport(clinicId, orderId, reportData, userId) {
        const existing = await this.supabase
            .from("radiology_reports")
            .select("id")
            .eq("order_id", orderId)
            .eq("clinic_id", clinicId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing.data) {
            const { error } = await this.supabase
                .from("radiology_reports")
                .update({
                    findings: reportData.findings,
                    impression: reportData.impression,
                    technique: reportData.technique || null,
                    comparison_studies: reportData.comparison_studies || null,
                    recommendations: reportData.recommendations || null,
                    status: reportData.status || "draft",
                    signed_at: reportData.status === "final" ? new Date().toISOString() : null,
                })
                .eq("id", existing.data.id)
                .eq("clinic_id", clinicId);

            if (error) throw error;

            if (reportData.status === "final" || reportData.status === "preliminary") {
                await this.transitionStatus(clinicId, orderId, "report_written", userId);
            }
            return existing.data.id;
        } else {
            const { data, error } = await this.supabase
                .from("radiology_reports")
                .insert({
                    order_id: orderId,
                    clinic_id: clinicId,
                    findings: reportData.findings,
                    impression: reportData.impression,
                    technique: reportData.technique || null,
                    comparison_studies: reportData.comparison_studies || null,
                    recommendations: reportData.recommendations || null,
                    status: reportData.status || "draft",
                    signed_at: reportData.status === "final" ? new Date().toISOString() : null,
                    radiologist_id: userId,
                    created_by: userId,
                })
                .select()
                .single();

            if (error) throw error;

            if (reportData.status === "final" || reportData.status === "preliminary") {
                await this.transitionStatus(clinicId, orderId, "report_written", userId);
            }
            return data.id;
        }
    }

    async getStats(clinicId) {
        const { data, error } = await this.supabase
            .from("radiology_orders")
            .select("status, modality")
            .eq("clinic_id", clinicId);

        if (error) throw error;

        const stats = {
            total: data.length,
            ordered: 0,
            scheduled: 0,
            imaging_done: 0,
            report_written: 0,
            completed: 0,
            cancelled: 0,
            urgent: 0,
            byModality: {},
        };

        for (const row of data) {
            if (stats[row.status] !== undefined) stats[row.status]++;
            stats.byModality[row.modality] = (stats.byModality[row.modality] || 0) + 1;
        }

        return stats;
    }

    async getPatients(clinicId) {
        const { data, error } = await this.supabase
            .from("patients")
            .select("id, full_name, phone, date_of_birth")
            .eq("clinic_id", clinicId)
            .order("full_name");

        if (error) throw error;
        return data || [];
    }

    async getStaff(clinicId) {
        const { data, error } = await this.supabase
            .from("clinic_staff")
            .select("users(id, full_name, email), role")
            .eq("clinic_id", clinicId);

        if (error) throw error;
        return (data || []).map(cs => ({ ...cs.users, staff_role: cs.role }));
    }
}

export function getRadiologyService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new RadiologyService(supabase);
    return cachedService;
}
