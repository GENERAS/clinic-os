import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";

let cachedService = null;

export class AdvancedInventoryService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async _recordTransaction(clinicId, itemId, type, quantity, previousStock, newStock, reason, userId) {
    const { data, error } = await this.supabase
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
    if (error) throw error;
    return data;
  }

  async getSuppliers(clinicId) {
    const { data, error } = await this.supabase
      .from("inventory_suppliers")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createSupplier(clinicId, data) {
    const { data: supplier, error } = await this.supabase
      .from("inventory_suppliers")
      .insert({ clinic_id: clinicId, ...data })
      .select()
      .single();
    if (error) throw error;
    return supplier;
  }

  async updateSupplier(clinicId, supplierId, data) {
    const { data: supplier, error } = await this.supabase
      .from("inventory_suppliers")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", supplierId)
      .eq("clinic_id", clinicId)
      .select()
      .single();
    if (error) throw error;
    return supplier;
  }

  async getSupplierItems(supplierId) {
    const { data, error } = await this.supabase
      .from("inventory_supplier_items")
      .select(`
        *,
        inventory_items(id, name, unit, current_stock)
      `)
      .eq("supplier_id", supplierId);
    if (error) throw error;
    return data || [];
  }

  async linkSupplierItem(supplierId, inventoryItemId, data) {
    const { data: link, error } = await this.supabase
      .from("inventory_supplier_items")
      .upsert({
        supplier_id: supplierId,
        inventory_item_id: inventoryItemId,
        unit_cost: data.unit_cost || 0,
        lead_time_days: data.lead_time_days || 7,
        minimum_order_quantity: data.minimum_order_quantity || 1,
        supplier_item_code: data.supplier_item_code || null,
      }, { onConflict: "supplier_id,inventory_item_id" })
      .select()
      .single();
    if (error) throw error;
    return link;
  }

  async getProcedureConsumables(clinicId) {
    const { data, error } = await this.supabase
      .from("procedure_consumables")
      .select(`
        *,
        inventory_items(id, name, unit, current_stock)
      `)
      .eq("clinic_id", clinicId)
      .order("procedure_name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createProcedureConsumable(clinicId, data) {
    const { data: record, error } = await this.supabase
      .from("procedure_consumables")
      .insert({ clinic_id: clinicId, ...data })
      .select()
      .single();
    if (error) throw error;
    return record;
  }

  async deleteProcedureConsumable(clinicId, id) {
    const { error } = await this.supabase
      .from("procedure_consumables")
      .delete()
      .eq("id", id)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async getConsumablesForProcedure(clinicId, procedureName) {
    const { data, error } = await this.supabase
      .from("procedure_consumables")
      .select(`
        *,
        inventory_items(id, name, unit, current_stock)
      `)
      .eq("clinic_id", clinicId)
      .eq("procedure_name", procedureName);
    if (error) throw error;
    return data || [];
  }

  async deductProcedureConsumables(clinicId, procedureName, userId) {
    const consumables = await this.getConsumablesForProcedure(clinicId, procedureName);
    const deductions = [];

    for (const entry of consumables) {
      const itemId = entry.inventory_item_id;
      const quantityNeeded = entry.quantity_required || 1;

      const { data: item } = await this.supabase
        .from("inventory_items")
        .select("current_stock")
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .single();

      if (!item) continue;

      const previousStock = item.current_stock;
      const newStock = Math.max(0, previousStock - quantityNeeded);

      await this.supabase
        .from("inventory_items")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("clinic_id", clinicId);

      await this._recordTransaction(
        clinicId,
        itemId,
        "stock_out",
        quantityNeeded,
        previousStock,
        newStock,
        `Procedure consumable: ${procedureName}`,
        userId
      );

      deductions.push({
        item_id: itemId,
        quantity: quantityNeeded,
        previous_stock: previousStock,
        new_stock: newStock,
      });
    }

    return deductions;
  }

  async getReorderSuggestions(clinicId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: items, error: itemsError } = await this.supabase
      .from("inventory_items")
      .select("*")
      .eq("clinic_id", clinicId);
    if (itemsError) throw itemsError;

    const { data: transactions } = await this.supabase
      .from("inventory_transactions")
      .select("inventory_item_id, quantity, created_at")
      .eq("clinic_id", clinicId)
      .in("type", ["dispensed", "stock_out", "expired"])
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: supplierLinks } = await this.supabase
      .from("inventory_supplier_items")
      .select(`
        inventory_item_id,
        lead_time_days,
        unit_cost,
        inventory_suppliers(id, name)
      `)
      .eq("clinic_id", clinicId);

    const consumptionByItem = {};
    for (const tx of transactions || []) {
      if (!consumptionByItem[tx.inventory_item_id]) {
        consumptionByItem[tx.inventory_item_id] = 0;
      }
      consumptionByItem[tx.inventory_item_id] += tx.quantity;
    }

    const supplierMap = {};
    for (const link of supplierLinks || []) {
      if (!supplierMap[link.inventory_item_id]) {
        supplierMap[link.inventory_item_id] = link;
      }
    }

    const suggestions = [];
    for (const item of items || []) {
      if (item.current_stock > item.minimum_stock) continue;

      const totalConsumed = consumptionByItem[item.id] || 0;
      const dailyRate = totalConsumed / 30;
      const supplierInfo = supplierMap[item.id];
      const leadTime = supplierInfo?.lead_time_days || 7;
      const reorderQty = Math.ceil(dailyRate * leadTime) || 1;

      suggestions.push({
        item_id: item.id,
        item_name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        daily_rate: Math.round(dailyRate * 100) / 100,
        lead_time_days: leadTime,
        reorder_quantity: reorderQty,
        unit_cost: supplierInfo?.unit_cost || 0,
        supplier_name: supplierInfo?.inventory_suppliers?.name || null,
      });
    }

    return suggestions.sort((a, b) => a.current_stock - b.current_stock);
  }

  async getPurchaseOrders(clinicId, status = null) {
    let query = this.supabase
      .from("purchase_orders")
      .select(`
        *,
        inventory_suppliers(id, name),
        purchase_order_items(*)
      `)
      .eq("clinic_id", clinicId);

    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPurchaseOrder(clinicId, supplierId, items, userId) {
    const totalAmount = items.reduce((sum, item) =>
      sum + (item.quantity * (item.unit_cost || 0)), 0);

    const { data: po, error: poError } = await this.supabase
      .from("purchase_orders")
      .insert({
        clinic_id: clinicId,
        supplier_id: supplierId,
        status: "draft",
        total_amount: totalAmount,
        created_by: userId,
      })
      .select()
      .single();
    if (poError) throw poError;

    if (items.length > 0) {
      const { error: itemsError } = await this.supabase
        .from("purchase_order_items")
        .insert(items.map(item => ({
          purchase_order_id: po.id,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost || 0,
          total: item.quantity * (item.unit_cost || 0),
        })));
      if (itemsError) throw itemsError;
    }

    return po;
  }

  async receivePurchaseOrder(clinicId, poId, receivedItems, userId) {
    const { data: po, error: poError } = await this.supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", poId)
      .eq("clinic_id", clinicId)
      .single();
    if (poError || !po) throw new Error("Purchase order not found");

    for (const received of receivedItems) {
      const { data: item } = await this.supabase
        .from("inventory_items")
        .select("current_stock")
        .eq("id", received.inventory_item_id)
        .eq("clinic_id", clinicId)
        .single();

      if (!item) continue;

      const previousStock = item.current_stock;
      const quantityReceived = received.quantity || 0;
      const newStock = previousStock + quantityReceived;

      await this.supabase
        .from("inventory_items")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", received.inventory_item_id)
        .eq("clinic_id", clinicId);

      await this._recordTransaction(
        clinicId,
        received.inventory_item_id,
        "stock_in",
        quantityReceived,
        previousStock,
        newStock,
        `PO received: ${poId}`,
        userId
      );
    }

    await this.supabase
      .from("purchase_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", poId)
      .eq("clinic_id", clinicId);

    return po;
  }

  async getStockTransfers(clinicId) {
    const { data, error } = await this.supabase
      .from("stock_transfers")
      .select(`
        *,
        inventory_items!stock_transfers_inventory_item_id_fkey(id, name, unit)
      `)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createStockTransfer(clinicId, data, userId) {
    const { data: transfer, error } = await this.supabase
      .from("stock_transfers")
      .insert({
        clinic_id: clinicId,
        inventory_item_id: data.inventory_item_id,
        quantity: data.quantity,
        from_location: data.from_location || null,
        to_location: data.to_location || null,
        status: "pending",
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return transfer;
  }

  async receiveStockTransfer(clinicId, transferId, userId) {
    const { data: transfer, error: transferError } = await this.supabase
      .from("stock_transfers")
      .select("*")
      .eq("id", transferId)
      .eq("clinic_id", clinicId)
      .single();
    if (transferError || !transfer) throw new Error("Transfer not found");

    const { data: item } = await this.supabase
      .from("inventory_items")
      .select("current_stock")
      .eq("id", transfer.inventory_item_id)
      .eq("clinic_id", clinicId)
      .single();

    if (!item) throw new Error("Inventory item not found");

    const previousStock = item.current_stock;
    const newStock = previousStock + transfer.quantity;

    await this.supabase
      .from("inventory_items")
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", transfer.inventory_item_id)
      .eq("clinic_id", clinicId);

    await this._recordTransaction(
      clinicId,
      transfer.inventory_item_id,
      "stock_in",
      transfer.quantity,
      previousStock,
      newStock,
      `Stock transfer received: ${transferId}`,
      userId
    );

    await this.supabase
      .from("stock_transfers")
      .update({ status: "received", received_at: new Date().toISOString(), received_by: userId })
      .eq("id", transferId)
      .eq("clinic_id", clinicId);

    return transfer;
  }

  async getInventoryValuation(clinicId) {
    const { data: items, error: itemsError } = await this.supabase
      .from("inventory_items")
      .select("id, name, unit, current_stock")
      .eq("clinic_id", clinicId);
    if (itemsError) throw itemsError;

    const { data: batches } = await this.supabase
      .from("inventory_batches")
      .select("inventory_item_id, quantity, cost_price")
      .eq("clinic_id", clinicId)
      .gt("quantity", 0);

    const batchValueByItem = {};
    for (const batch of batches || []) {
      if (!batchValueByItem[batch.inventory_item_id]) {
        batchValueByItem[batch.inventory_item_id] = { total_cost: 0, total_qty: 0 };
      }
      batchValueByItem[batch.inventory_item_id].total_cost += batch.quantity * (batch.cost_price || 0);
      batchValueByItem[batch.inventory_item_id].total_qty += batch.quantity;
    }

    const items_with_value = (items || []).map(item => {
      const batchInfo = batchValueByItem[item.id];
      const avgCost = batchInfo && batchInfo.total_qty > 0
        ? batchInfo.total_cost / batchInfo.total_qty
        : 0;
      const totalValue = item.current_stock * avgCost;

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        average_cost: Math.round(avgCost * 100) / 100,
        total_value: Math.round(totalValue * 100) / 100,
      };
    });

    const total_valuation = items_with_value.reduce((sum, i) => sum + i.total_value, 0);

    return {
      total_valuation: Math.round(total_valuation * 100) / 100,
      item_count: items_with_value.length,
      items: items_with_value,
    };
  }

  async getConsumptionReport(clinicId, dateFrom, dateTo) {
    const { data: transactions, error } = await this.supabase
      .from("inventory_transactions")
      .select(`
        inventory_item_id,
        type,
        quantity,
        created_at,
        inventory_items(id, name, unit)
      `)
      .eq("clinic_id", clinicId)
      .in("type", ["dispensed", "stock_out", "expired"])
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);
    if (error) throw error;

    const consumptionByItem = {};
    for (const tx of transactions || []) {
      const itemId = tx.inventory_item_id;
      if (!consumptionByItem[itemId]) {
        const item = tx.inventory_items;
        consumptionByItem[itemId] = {
          item_id: itemId,
          item_name: item?.name || "Unknown",
          unit: item?.unit || "units",
          total_consumed: 0,
          transaction_count: 0,
          by_type: {},
        };
      }
      const entry = consumptionByItem[itemId];
      entry.total_consumed += tx.quantity;
      entry.transaction_count += 1;
      entry.by_type[tx.type] = (entry.by_type[tx.type] || 0) + tx.quantity;
    }

    const periodDays = Math.max(1, Math.ceil(
      (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)
    ));

    const items = Object.values(consumptionByItem)
      .map(entry => ({
        ...entry,
        daily_rate: Math.round((entry.total_consumed / periodDays) * 100) / 100,
      }))
      .sort((a, b) => b.total_consumed - a.total_consumed);

    return {
      period: { dateFrom, dateTo, period_days: periodDays },
      total_items_consumed: items.length,
      total_transactions: (transactions || []).length,
      items,
    };
  }
}

export function getAdvancedInventoryService() {
  if (cachedService) return cachedService;
  const supabase = createClient();
  cachedService = new AdvancedInventoryService(supabase);
  return cachedService;
}
