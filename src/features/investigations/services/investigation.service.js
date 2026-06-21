import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class InvestigationService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getInvestigations(clinicId, filters = {}) {
        let query = this.supabase
            .from("investigations")
            .select(`
                *,
                consultations!inner(
                    id, patient_id, chief_complaint,
                    patients(id, full_name, phone)
                )
            `)
            .eq("investigations.clinic_id", clinicId);

        if (filters.status) {
            query = query.eq("investigations.status", filters.status);
        }
        if (filters.category) {
            query = query.eq("investigations.category", filters.category);
        }
        if (filters.patientId) {
            query = query.eq("investigations.patient_id", filters.patientId);
        }

        if (filters.pendingOnly) {
            query = query.in("investigations.status", ["ordered", "sample_collected"]);
        }

        const { data, error } = await query
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async updateResult(clinicId, investigationId, resultData, userId) {
        const { error } = await this.supabase
            .from("investigations")
            .update({
                result_value: resultData.result_value,
                result_unit: resultData.result_unit,
                reference_range: resultData.reference_range,
                is_abnormal: resultData.is_abnormal || false,
                result_notes: resultData.result_notes,
                status: resultData.status || "completed",
                result_entered_at: new Date().toISOString(),
                result_entered_by: userId,
            })
            .eq("id", investigationId);

        if (error) throw error;
    }

    async getPendingCount(clinicId) {
        const { count, error } = await this.supabase
            .from("investigations")
            .select("*", { count: "exact", head: true })
            .eq("clinic_id", clinicId)
            .in("status", ["ordered", "sample_collected"]);

        if (error) throw error;
        return count || 0;
    }

    async getCategories(clinicId) {
        const { data, error } = await this.supabase
            .from("investigations")
            .select("category")
            .eq("clinic_id", clinicId)
            .not("category", "is", null);

        if (error) throw error;
        const cats = [...new Set((data || []).map(i => i.category).filter(Boolean))];
        return cats.sort();
    }
}

export function getInvestigationService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new InvestigationService(supabase);
    return cachedService;
}
