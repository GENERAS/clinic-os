import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class PharmacyService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getPendingPrescriptions(clinicId, search = "") {
        let query = this.supabase
            .from("prescriptions")
            .select(`
                *,
                consultations!inner(
                    id, created_at, chief_complaint, doctor_id,
                    patients!inner(id, full_name, phone, gender)
                )
            `)
            .eq("consultations.clinic_id", clinicId)
            .neq("dispensed_status", "dispensed")
            .in("dispensed_status", ["pending", "partial"]);

        if (search.trim()) {
            const q = search.trim();
            query = query.or(
                `consultations.patients.full_name.ilike.%${q}%,medicine_name.ilike.%${q}%`
            );
        }

        const { data, error } = await query
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getPrescriptionById(clinicId, prescriptionId) {
        const { data, error } = await this.supabase
            .from("prescriptions")
            .select(`
                *,
                consultations!inner(
                    id, created_at, chief_complaint, doctor_id,
                    patients!inner(id, full_name, phone, gender, date_of_birth),
                    users!consultations_doctor_id_fkey(id, full_name)
                )
            `)
            .eq("consultations.clinic_id", clinicId)
            .eq("id", prescriptionId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async getPrescriptionsByConsultation(clinicId, consultationId) {
        const { data, error } = await this.supabase
            .from("prescriptions")
            .select(`
                *,
                dispensations(*)
            `)
            .eq("consultations.clinic_id", clinicId)
            .eq("consultation_id", consultationId)
            .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async findInventoryItem(clinicId, medicineName) {
        const { data, error } = await this.supabase
            .from("inventory_items")
            .select("id, name, current_stock, minimum_stock, unit")
            .eq("clinic_id", clinicId)
            .eq("name", medicineName)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async getBatchesForItem(clinicId, itemId) {
        const { data, error } = await this.supabase
            .from("inventory_batches")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("inventory_item_id", itemId)
            .gt("quantity", 0)
            .order("expiry_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getNearExpiryBatches(clinicId, withinDays = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + withinDays);
        const { data, error } = await this.supabase
            .from("inventory_batches")
            .select(`
                *,
                inventory_items!inner(id, name, unit, current_stock)
            `)
            .eq("clinic_id", clinicId)
            .gt("quantity", 0)
            .lte("expiry_date", cutoff.toISOString().split("T")[0])
            .order("expiry_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async dispense(clinicId, data, userId) {
        const { error: rxError } = await this.supabase
            .from("prescriptions")
            .select("quantity, quantity_dispensed, dispensed_status")
            .eq("id", data.prescription_id)
            .single();

        const { data: prescription } = await this.supabase
            .from("prescriptions")
            .select("quantity, quantity_dispensed, dispensed_status, consultation_id, patient_id")
            .eq("id", data.prescription_id)
            .single();

        if (!prescription) throw new Error("Prescription not found");

        const newDispensed = (prescription.quantity_dispensed || 0) + data.quantity_dispensed;
        const totalQty = prescription.quantity || 1;
        let newStatus = "partial";
        if (newDispensed >= totalQty) newStatus = "dispensed";

        const { data: dispensation, error: dispError } = await this.supabase
            .from("dispensations")
            .insert({
                clinic_id: clinicId,
                prescription_id: data.prescription_id,
                consultation_id: prescription.consultation_id,
                patient_id: prescription.patient_id,
                inventory_item_id: data.inventory_item_id,
                batch_id: data.batch_id || null,
                medicine_name: data.medicine_name,
                quantity_dispensed: data.quantity_dispensed,
                dispensed_by: userId,
                notes: data.notes || null,
            })
            .select("id")
            .single();

        if (dispError) throw dispError;

        await this.supabase
            .from("prescriptions")
            .update({ quantity_dispensed: newDispensed, dispensed_status: newStatus })
            .eq("id", data.prescription_id);

        if (data.batch_id) {
            const { data: batch } = await this.supabase
                .from("inventory_batches")
                .select("quantity")
                .eq("id", data.batch_id)
                .single();
            if (batch) {
                await this.supabase
                    .from("inventory_batches")
                    .update({ quantity: Math.max(0, batch.quantity - data.quantity_dispensed) })
                    .eq("id", data.batch_id);
            }
        }

        const { data: item } = await this.supabase
            .from("inventory_items")
            .select("current_stock")
            .eq("id", data.inventory_item_id)
            .single();

        if (item) {
            const newStock = Math.max(0, item.current_stock - data.quantity_dispensed);
            await this.supabase
                .from("inventory_items")
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", data.inventory_item_id);

            await this.supabase
                .from("inventory_transactions")
                .insert({
                    clinic_id: clinicId,
                    inventory_item_id: data.inventory_item_id,
                    type: "dispensed",
                    quantity: data.quantity_dispensed,
                    previous_stock: item.current_stock,
                    new_stock: newStock,
                    reason: `Dispensed: Rx #${data.prescription_id.substring(0, 8)}`,
                    performed_by: userId,
                });
        }

        return dispensation.id;
    }

    async getInventoryItemsWithStock(clinicId, search = "") {
        let query = this.supabase
            .from("inventory_items")
            .select("id, name, current_stock, minimum_stock, unit")
            .eq("clinic_id", clinicId)
            .gt("current_stock", 0);

        if (search.trim()) {
            query = query.ilike("name", `%${search.trim()}%`);
        }

        const { data, error } = await query
            .order("name", { ascending: true })
            .limit(100);

        if (error) throw error;
        return data || [];
    }

    async getPharmacyStats(clinicId) {
        const today = new Date().toISOString().split("T")[0];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 90);

        const [
            { count: pendingCount },
            { count: dispensedToday },
            nearExpiry,
            { data: lowStock },
        ] = await Promise.all([
            this.supabase
                .from("prescriptions")
                .select("*", { count: "exact", head: true })
                .eq("clinic_id", clinicId)
                .in("dispensed_status", ["pending", "partial"]),
            this.supabase
                .from("dispensations")
                .select("*", { count: "exact", head: true })
                .eq("clinic_id", clinicId)
                .gte("dispensed_at", today),
            this.getNearExpiryBatches(clinicId, 90),
            this.supabase
                .from("inventory_items")
                .select("id, name, current_stock, minimum_stock")
                .eq("clinic_id", clinicId)
                .gt("current_stock", 0),
        ]);

        const filteredLowStock = (lowStock || []).filter(
            item => item.current_stock <= item.minimum_stock
        );

        return {
            pending_prescriptions: pendingCount || 0,
            dispensed_today: dispensedToday || 0,
            near_expiry_batches: nearExpiry.length,
            near_expiry_items: nearExpiry,
            low_stock_items: filteredLowStock,
        };
    }
}

export function getPharmacyService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new PharmacyService(supabase);
    return cachedService;
}
