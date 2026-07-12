import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class MasterDataService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Insurance Providers
    async getInsuranceProviders(clinicId) {
        const { data, error } = await this.supabase
            .from("insurance_providers")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("name");
        if (error) throw error;
        return data || [];
    }

    async createInsuranceProvider(clinicId, data) {
        const { data: result, error } = await this.supabase
            .from("insurance_providers")
            .insert({ clinic_id: clinicId, ...data })
            .select("id")
            .single();
        if (error) throw error;
        return result.id;
    }

    async updateInsuranceProvider(clinicId, id, data) {
        const { error } = await this.supabase
            .from("insurance_providers")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteInsuranceProvider(clinicId, id) {
        const { error } = await this.supabase
            .from("insurance_providers")
            .delete()
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    // Service Catalog
    async getServices(clinicId, category = null) {
        let query = this.supabase
            .from("service_catalog")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("is_active", true);
        if (category) query = query.eq("category", category);
        const { data, error } = await query.order("name");
        if (error) throw error;
        return data || [];
    }

    async createService(clinicId, data) {
        const { data: result, error } = await this.supabase
            .from("service_catalog")
            .insert({ clinic_id: clinicId, is_active: true, ...data })
            .select("id")
            .single();
        if (error) throw error;
        return result.id;
    }

    async updateService(clinicId, id, data) {
        const { error } = await this.supabase
            .from("service_catalog")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteService(clinicId, id) {
        const { error } = await this.supabase
            .from("service_catalog")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    // Lab Tests
    async getLabTests(clinicId) {
        const { data, error } = await this.supabase
            .from("lab_test_catalog")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("is_active", true)
            .order("name");
        if (error) throw error;
        return data || [];
    }

    async createLabTest(clinicId, data) {
        const { data: result, error } = await this.supabase
            .from("lab_test_catalog")
            .insert({ clinic_id: clinicId, ...data })
            .select("id")
            .single();
        if (error) throw error;
        return result.id;
    }

    async updateLabTest(clinicId, id, data) {
        const { error } = await this.supabase
            .from("lab_test_catalog")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteLabTest(clinicId, id) {
        const { error } = await this.supabase
            .from("lab_test_catalog")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    // Medicines
    async getMedicines(clinicId) {
        const { data, error } = await this.supabase
            .from("medicine_catalog")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("is_active", true)
            .order("name");
        if (error) throw error;
        return data || [];
    }

    async createMedicine(clinicId, data) {
        const { data: result, error } = await this.supabase
            .from("medicine_catalog")
            .insert({ clinic_id: clinicId, ...data })
            .select("id")
            .single();
        if (error) throw error;
        return result.id;
    }

    async updateMedicine(clinicId, id, data) {
        const { error } = await this.supabase
            .from("medicine_catalog")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteMedicine(clinicId, id) {
        const { error } = await this.supabase
            .from("medicine_catalog")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }
}

export function getMasterDataService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new MasterDataService(supabase);
    return cachedService;
}
