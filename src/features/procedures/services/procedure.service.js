import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";

let cachedService = null;

export function getProcedureService() {
  if (cachedService) return cachedService;
  const supabase = createClient();
  const audit = getAuditService();

  const service = {
    async getProcedures(clinicId, filters = {}) {
      let query = supabase
        .from("consultations")
        .select(`
          id, created_at, procedure_name, treatment_plan, status,
          patients!inner(id, full_name),
          users!consultations_doctor_id_fkey(id, full_name)
        `)
        .eq("clinic_id", clinicId)
        .not("procedure_name", "is", null)
        .neq("procedure_name", "");

      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
      if (filters.patientId) query = query.eq("patient_id", filters.patientId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getProcedureCatalog(clinicId) {
      const { data: consumables } = await supabase
        .from("procedure_consumables")
        .select("procedure_name")
        .eq("clinic_id", clinicId);

      const names = [...new Set((consumables || []).map(c => c.procedure_name))];
      return names.sort();
    },

    async getProcedureConsumables(clinicId, procedureName) {
      const { data, error } = await supabase
        .from("procedure_consumables")
        .select(`
          *,
          inventory_items!inner(id, name, current_stock, unit)
        `)
        .eq("clinic_id", clinicId)
        .eq("procedure_name", procedureName);
      if (error) throw error;
      return data || [];
    },

    async getDoctors(clinicId) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "Doctor")
        .maybeSingle();
      if (!roleData) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("users(id, full_name)")
        .eq("role_id", roleData.id)
        .in("users.status", ["active"]);
      return (data || []).map(r => ({ id: r.users.id, full_name: r.users.full_name }));
    },

    async searchPatients(clinicId, query) {
      if (!query || query.trim().length < 2) return [];
      const q = query.trim();
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone, gender")
        .eq("clinic_id", clinicId)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .order("full_name")
        .limit(15);
      if (error) throw error;
      return data || [];
    },

    async getInventoryItems(clinicId) {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock, unit")
        .eq("clinic_id", clinicId)
        .order("name");
      if (error) throw error;
      return data || [];
    },

    async recordProcedure(clinicId, data, userId) {
      const { data: consultation, error } = await supabase
        .from("consultations")
        .insert({
          clinic_id: clinicId,
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          chief_complaint: `Procedure: ${data.procedure_name}`,
          physical_examination: data.findings || "",
          assessment: data.procedure_name,
          treatment_plan: data.notes || "",
          procedure_name: data.procedure_name,
          status: "completed",
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (data.consumables?.length > 0) {
        for (const item of data.consumables) {
          const { data: invItem } = await supabase
            .from("inventory_items")
            .select("current_stock")
            .eq("id", item.inventory_item_id)
            .single();

          if (invItem) {
            const newStock = Math.max(0, invItem.current_stock - item.quantity);
            await supabase
              .from("inventory_items")
              .update({ current_stock: newStock, updated_at: new Date().toISOString() })
              .eq("id", item.inventory_item_id);

            await supabase
              .from("inventory_transactions")
              .insert({
                clinic_id: clinicId,
                inventory_item_id: item.inventory_item_id,
                type: "dispensed",
                quantity: item.quantity,
                previous_stock: invItem.current_stock,
                new_stock: newStock,
                reason: `Procedure: ${data.procedure_name}`,
                performed_by: userId,
              });
          }
        }
      }

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "procedure recorded",
        entity_type: "consultations",
        entity_id: consultation.id,
        new_value: { procedure_name: data.procedure_name },
      }).catch(() => {});

      return consultation.id;
    },
  };

  cachedService = service;
  return service;
}
