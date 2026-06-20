import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { fetchUsers, enrichUser } from "@/lib/supabase/users";

const getStatus = (current, minimum) => {
    if (current <= 0)
        return "out_of_stock";
    if (current <= minimum)
        return "low_stock";
    return "in_stock";
};

const _catCache = new Map();

async function _loadCategories(clinicId, ids) {
    const missing = [...new Set((ids || []).filter(id => id != null && !_catCache.has(id)))];
    if (missing.length === 0) return;
    const supabase = createClient();
    const { data } = await supabase
        .from("inventory_categories")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .in("id", missing);
    (data || []).forEach(c => _catCache.set(c.id, c.name));
}

function _getCategoryName(id) {
    return id != null ? _catCache.get(id) || null : null;
}

export function getInventoryService() {
    const supabase = createClient();
    const audit = getAuditService();
    const recordTransaction = async (clinicId, itemId, type, quantity, previousStock, newStock, reason, userId) => {
        const { data, error } = await supabase
            .from("inventory_transactions")
            .insert({
            clinic_id: clinicId,
            inventory_item_id: itemId,
            type,
            quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            reason,
            performed_by: userId,
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    };
    return {
        async getCategories(clinicId) {
            const { data, error } = await supabase
                .from("inventory_categories")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("name", { ascending: true });
            if (error)
                throw error;
            return (data || []);
        },
        async createCategory(clinicId, name, description) {
            const { data, error } = await supabase
                .from("inventory_categories")
                .insert({ clinic_id: clinicId, name, description: description || null })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async createInventoryItem(clinicId, values, userId) {
            const { data, error } = await supabase
                .from("inventory_items")
                .insert({ ...values, clinic_id: clinicId, created_by: userId })
                .select()
                .single();
            if (error)
                throw error;
            const item = data;
            if (item.current_stock > 0) {
                await recordTransaction(clinicId, item.id, "stock_in", item.current_stock, 0, item.current_stock, "Initial stock", userId);
            }
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "inventory created",
                entity_type: "inventory_items",
                entity_id: item.id,
                new_value: { name: item.name, current_stock: item.current_stock, minimum_stock: item.minimum_stock },
            }).catch(() => { });
            return item;
        },
        async updateInventoryItem(clinicId, itemId, values, userId) {
            const { data: current } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .single();
            if (!current)
                throw new Error("Item not found");
            const { data, error } = await supabase
                .from("inventory_items")
                .update({ ...values, updated_at: new Date().toISOString() })
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .select()
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "inventory updated",
                entity_type: "inventory_items",
                entity_id: itemId,
                old_value: { name: current.name },
                new_value: values,
            }).catch(() => { });
            return data;
        },
        async getInventoryItems(clinicId, options) {
            const page = options?.page || 0;
            const pageSize = options?.pageSize || 20;
            const sortField = options?.sortField || "name";
            const sortOrder = options?.sortOrder || "asc";
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const statusFilter = options?.status && options.status !== "all" ? options.status : null;
            let query = supabase
                .from("inventory_items")
                .select("*", { count: statusFilter ? null : "exact" })
                .eq("clinic_id", clinicId);
            if (options?.search) {
                const q = options.search;
                query = query.or(`name.ilike.%${q}%`);
            }
            if (options?.category_id) {
                query = query.eq("category_id", options.category_id);
            }
            if (statusFilter) {
                const allData = await query.order(sortField, { ascending: sortOrder === "asc" });
                if (allData.error) throw allData.error;
                const rawItems = allData.data || [];
                const catIds = rawItems.map(r => r.category_id);
                await _loadCategories(clinicId, catIds);
                const userIds = rawItems.map(r => r.created_by);
                await fetchUsers(clinicId, userIds);
                const allItems = rawItems.map((row) => {
                    return {
                        id: row.id,
                        name: row.name,
                        unit: row.unit,
                        current_stock: row.current_stock,
                        minimum_stock: row.minimum_stock,
                        category_name: _getCategoryName(row.category_id),
                        status: getStatus(row.current_stock, row.minimum_stock),
                        created_by_name: enrichUser(row.created_by)?.full_name || "Unknown",
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    };
                });
                const filtered = allItems.filter((i) => i.status === statusFilter);
                const paged = filtered.slice(from, from + pageSize);
                return { data: paged, total: filtered.length };
            }
            const { data, error, count } = await query
                .order(sortField, { ascending: sortOrder === "asc" })
                .range(from, to);
            if (error)
                throw error;
            const rawItems = data || [];
            const catIds = rawItems.map(r => r.category_id);
            await _loadCategories(clinicId, catIds);
            const userIds = rawItems.map(r => r.created_by);
            await fetchUsers(clinicId, userIds);
            const items = rawItems.map((row) => {
                return {
                    id: row.id,
                    name: row.name,
                    unit: row.unit,
                    current_stock: row.current_stock,
                    minimum_stock: row.minimum_stock,
                    category_name: _getCategoryName(row.category_id),
                    status: getStatus(row.current_stock, row.minimum_stock),
                    created_by_name: enrichUser(row.created_by)?.full_name || "Unknown",
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                };
            });
            return { data: items, total: count || 0 };
        },
        async getInventoryItemById(clinicId, itemId) {
            const { data, error } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .single();
            if (error)
                return null;
            const item = data;
            await _loadCategories(clinicId, [item.category_id]);
            await fetchUsers(clinicId, [item.created_by]);
            return {
                ...item,
                category_name: _getCategoryName(item.category_id),
                status: getStatus(item.current_stock, item.minimum_stock),
                created_by_name: enrichUser(item.created_by)?.full_name || "Unknown",
            };
        },
        async adjustStock(clinicId, itemId, values, userId) {
            const { data: current } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .single();
            if (!current)
                throw new Error("Item not found");
            const item = current;
            const previousStock = item.current_stock;
            let newStock;
            if (values.type === "stock_in") {
                newStock = previousStock + values.quantity;
            }
            else if (values.type === "stock_out" || values.type === "expired") {
                newStock = Math.max(0, previousStock - values.quantity);
            }
            else {
                newStock = Math.max(0, values.quantity);
            }
            const { data, error } = await supabase
                .from("inventory_items")
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .select()
                .single();
            if (error)
                throw error;
            await recordTransaction(clinicId, itemId, values.type, values.quantity, previousStock, newStock, values.reason || null, userId);
            const actionLabel = values.type === "stock_in" ? "stock added" :
                values.type === "stock_out" ? "stock removed" :
                    values.type === "expired" ? "expired removed" :
                        "stock adjusted";
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: `inventory ${actionLabel}`,
                entity_type: "inventory_items",
                entity_id: itemId,
                old_value: { current_stock: previousStock },
                new_value: { current_stock: newStock, type: values.type, quantity: values.quantity },
            }).catch(() => { });
            return data;
        },
        async getTransactions(clinicId, itemId) {
            const { data, error } = await supabase
                .from("inventory_transactions")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("inventory_item_id", itemId)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error)
                throw error;
            const rows = data || [];
            const userIds = rows.map(r => r.performed_by);
            await fetchUsers(clinicId, userIds);
            return rows.map((row) => {
                return {
                    id: row.id,
                    inventory_item_id: row.inventory_item_id,
                    type: row.type,
                    quantity: row.quantity,
                    previous_stock: row.previous_stock,
                    new_stock: row.new_stock,
                    reason: row.reason,
                    performed_by_name: enrichUser(row.performed_by)?.full_name || "Unknown",
                    created_at: row.created_at,
                };
            });
        },
        async getLowStockItems(clinicId) {
            const { data, error } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
            const rawItems = data || [];
            const catIds = rawItems.map(r => r.category_id);
            await _loadCategories(clinicId, catIds);
            const userIds = rawItems.map(r => r.created_by);
            await fetchUsers(clinicId, userIds);
            return rawItems
                .filter((row) => {
                return row.current_stock > 0 && row.current_stock <= row.minimum_stock;
            })
                .map((row) => {
                return {
                    id: row.id,
                    name: row.name,
                    unit: row.unit,
                    current_stock: row.current_stock,
                    minimum_stock: row.minimum_stock,
                    category_name: _getCategoryName(row.category_id),
                    status: getStatus(row.current_stock, row.minimum_stock),
                    created_by_name: enrichUser(row.created_by)?.full_name || "Unknown",
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                };
            });
        },
        async getBatchesForItem(clinicId, itemId) {
            const { data, error } = await supabase
                .from("inventory_batches")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("inventory_item_id", itemId)
                .order("expiry_date", { ascending: true });
            if (error) throw error;
            return data || [];
        },
        async createInventoryBatch(clinicId, itemId, values, userId) {
            const { data: item } = await supabase
                .from("inventory_items")
                .select("current_stock")
                .eq("id", itemId)
                .eq("clinic_id", clinicId)
                .single();
            if (!item) throw new Error("Item not found");
            const { data, error } = await supabase
                .from("inventory_batches")
                .insert({
                    clinic_id: clinicId,
                    inventory_item_id: itemId,
                    batch_number: values.batch_number,
                    expiry_date: values.expiry_date,
                    quantity: values.quantity,
                    cost_price: values.cost_price || 0,
                    notes: values.notes || null,
                })
                .select()
                .single();
            if (error) throw error;
            const previousStock = item.current_stock;
            const newStock = previousStock + values.quantity;
            await supabase
                .from("inventory_items")
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", itemId)
                .eq("clinic_id", clinicId);
            await recordTransaction(clinicId, itemId, "stock_in", values.quantity, previousStock, newStock, `Batch received: ${values.batch_number}`, userId);
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "inventory batch received",
                entity_type: "inventory_batches",
                entity_id: data.id,
                new_value: { batch_number: values.batch_number, quantity: values.quantity, expiry_date: values.expiry_date },
            }).catch(() => { });
            return data;
        },
        async getStats(clinicId) {
            const { data, error } = await supabase
                .from("inventory_items")
                .select("current_stock, minimum_stock")
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
            const items = (data || []);
            return {
                total: items.length,
                lowStock: items.filter((i) => i.current_stock > 0 && i.current_stock <= i.minimum_stock).length,
                outOfStock: items.filter((i) => i.current_stock <= 0).length,
            };
        },
    };
}
