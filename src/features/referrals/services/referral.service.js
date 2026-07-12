import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class ReferralService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async createReferral(clinicId, data, userId) {
        const { data: referral, error } = await this.supabase
            .from("referrals")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                consultation_id: data.consultation_id || null,
                referral_type: data.referral_type,
                from_doctor_id: userId,
                to_provider: data.to_provider,
                to_facility: data.to_facility || null,
                reason: data.reason,
                clinical_summary: data.clinical_summary || null,
                diagnosis: data.diagnosis || null,
                tests_done: data.tests_done || null,
                treatment_given: data.treatment_given || null,
                urgency: data.urgency || "normal",
                notes: data.notes || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return referral.id;
    }

    async getReferrals(clinicId, filters = {}) {
        let query = this.supabase
            .from("referrals")
            .select(`
                *,
                patients(id, full_name, phone),
                users!referrals_from_doctor_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);

        if (filters.status && filters.status !== "all") {
            query = query.eq("status", filters.status);
        }
        if (filters.type && filters.type !== "all") {
            query = query.eq("referral_type", filters.type);
        }
        if (filters.urgency && filters.urgency !== "all") {
            query = query.eq("urgency", filters.urgency);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(r => ({
            ...r,
            doctor_name: r.users?.full_name || "Unknown",
        }));
    }

    async updateReferralStatus(clinicId, id, status, outcome, userId) {
        const updateData = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (outcome) updateData.outcome = outcome;
        const { error } = await this.supabase
            .from("referrals")
            .update(updateData)
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }
}

export function getReferralService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new ReferralService(supabase);
    return cachedService;
}
