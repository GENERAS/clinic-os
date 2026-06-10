import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUpdate,
  InventoryCategory,
  InventoryCategoryInsert,
  InventoryTransaction,
  InventoryTransactionInsert,
} from "@/types/database"
import type {
  InventoryItemSummary,
  InventoryItemWithDetails,
  InventoryTransactionWithUser,
  InventoryStatus,
  StockAdjustmentValues,
} from "../types"

const getStatus = (current: number, minimum: number): InventoryStatus => {
  if (current <= 0) return "out_of_stock"
  if (current <= minimum) return "low_stock"
  return "in_stock"
}

export function getInventoryService() {
  const supabase = createClient()
  const audit = getAuditService()

  const recordTransaction = async (
    clinicId: string,
    itemId: string,
    type: StockAdjustmentValues["type"],
    quantity: number,
    previousStock: number,
    newStock: number,
    reason: string | null,
    userId: string
  ): Promise<InventoryTransaction> => {
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
      } as InventoryTransactionInsert)
      .select()
      .single()
    if (error) throw error
    return data as InventoryTransaction
  }

  return {
    async getCategories(clinicId: string): Promise<InventoryCategory[]> {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true })
      if (error) throw error
      return (data || []) as InventoryCategory[]
    },

    async createCategory(clinicId: string, name: string, description?: string | null): Promise<InventoryCategory> {
      const { data, error } = await supabase
        .from("inventory_categories")
        .insert({ clinic_id: clinicId, name, description: description || null } as InventoryCategoryInsert)
        .select()
        .single()
      if (error) throw error
      return data as InventoryCategory
    },

    async createInventoryItem(
      clinicId: string,
      values: Omit<InventoryItemInsert, "clinic_id" | "created_by">,
      userId: string
    ): Promise<InventoryItem> {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({ ...values, clinic_id: clinicId, created_by: userId } as InventoryItemInsert)
        .select()
        .single()
      if (error) throw error

      const item = data as InventoryItem

      if (item.current_stock > 0) {
        await recordTransaction(clinicId, item.id, "stock_in", item.current_stock, 0, item.current_stock, "Initial stock", userId)
      }

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "inventory created",
        entity_type: "inventory_items",
        entity_id: item.id,
        new_value: { name: item.name, current_stock: item.current_stock, minimum_stock: item.minimum_stock },
      }).catch(() => {})

      return item
    },

    async updateInventoryItem(
      clinicId: string,
      itemId: string,
      values: InventoryItemUpdate,
      userId: string
    ): Promise<InventoryItem> {
      const { data: current } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .single()
      if (!current) throw new Error("Item not found")

      const { data, error } = await supabase
        .from("inventory_items")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "inventory updated",
        entity_type: "inventory_items",
        entity_id: itemId,
        old_value: { name: (current as InventoryItem).name },
        new_value: values as Record<string, unknown>,
      }).catch(() => {})

      return data as InventoryItem
    },

    async getInventoryItems(
      clinicId: string,
      options?: {
        search?: string
        category_id?: string
        status?: string
        page?: number
        pageSize?: number
        sortField?: string
        sortOrder?: "asc" | "desc"
      }
    ): Promise<{ data: InventoryItemSummary[]; total: number }> {
      const page = options?.page || 0
      const pageSize = options?.pageSize || 20
      const sortField = options?.sortField || "name"
      const sortOrder = options?.sortOrder || "asc"

      const from = page * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from("inventory_items")
        .select("*, category:category_id(name), users!created_by(full_name)", { count: "exact" })
        .eq("clinic_id", clinicId)

      if (options?.search) {
        const q = options.search
        query = query.or(`name.ilike.%${q}%`)
      }

      if (options?.category_id) {
        query = query.eq("category_id", options.category_id)
      }

      const { data, error, count } = await query
        .order(sortField, { ascending: sortOrder === "asc" })
        .range(from, to)

      if (error) throw error

      const items: InventoryItemSummary[] = (data || []).map((rowRaw: Record<string, unknown>) => {
        const row = rowRaw as unknown as InventoryItem & { category?: { name?: string }; users?: { full_name?: string } }
        return {
          id: row.id,
          name: row.name,
          unit: row.unit,
          current_stock: row.current_stock,
          minimum_stock: row.minimum_stock,
          category_name: row.category?.name || null,
          status: getStatus(row.current_stock, row.minimum_stock),
          created_by_name: row.users?.full_name || "Unknown",
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      })

      if (options?.status && options.status !== "all") {
        const filtered = items.filter((i) => i.status === options.status)
        return { data: filtered, total: filtered.length }
      }

      return { data: items, total: count || 0 }
    },

    async getInventoryItemById(clinicId: string, itemId: string): Promise<InventoryItemWithDetails | null> {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, category:category_id(name), users!created_by(full_name)")
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .single()
      if (error) return null

      const item = data as InventoryItem
      const cat = data.category as { name?: string } | undefined
      const user = data.users as { full_name?: string } | undefined

      return {
        ...item,
        category_name: cat?.name || null,
        status: getStatus(item.current_stock, item.minimum_stock),
        created_by_name: user?.full_name || "Unknown",
      }
    },

    async adjustStock(
      clinicId: string,
      itemId: string,
      values: StockAdjustmentValues,
      userId: string
    ): Promise<InventoryItem> {
      const { data: current } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .single()
      if (!current) throw new Error("Item not found")

      const item = current as InventoryItem
      const previousStock = item.current_stock

      let newStock: number
      if (values.type === "stock_in") {
        newStock = previousStock + values.quantity
      } else if (values.type === "stock_out" || values.type === "expired") {
        newStock = Math.max(0, previousStock - values.quantity)
      } else {
        newStock = Math.max(0, values.quantity)
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      await recordTransaction(clinicId, itemId, values.type, values.quantity, previousStock, newStock, values.reason || null, userId)

      const actionLabel =
        values.type === "stock_in" ? "stock added" :
        values.type === "stock_out" ? "stock removed" :
        values.type === "expired" ? "expired removed" :
        "stock adjusted"

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: `inventory ${actionLabel}`,
        entity_type: "inventory_items",
        entity_id: itemId,
        old_value: { current_stock: previousStock },
        new_value: { current_stock: newStock, type: values.type, quantity: values.quantity },
      }).catch(() => {})

      return data as InventoryItem
    },

    async getTransactions(clinicId: string, itemId: string): Promise<InventoryTransactionWithUser[]> {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*, users!performed_by(full_name)")
        .eq("clinic_id", clinicId)
        .eq("inventory_item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error

      return (data || []).map((rowRaw: Record<string, unknown>) => {
        const row = rowRaw as unknown as InventoryTransaction & { users?: { full_name?: string } }
        return {
          id: row.id,
          inventory_item_id: row.inventory_item_id,
          type: row.type,
          quantity: row.quantity,
          previous_stock: row.previous_stock,
          new_stock: row.new_stock,
          reason: row.reason,
          performed_by_name: row.users?.full_name || "Unknown",
          created_at: row.created_at,
        }
      })
    },

    async getLowStockItems(clinicId: string): Promise<InventoryItemSummary[]> {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, category:category_id(name), users!created_by(full_name)")
        .eq("clinic_id", clinicId)
      if (error) throw error

      return (data || [])
        .filter((rowRaw: Record<string, unknown>) => {
          const row = rowRaw as unknown as InventoryItem
          return row.current_stock > 0 && row.current_stock <= row.minimum_stock
        })
        .map((rowRaw: Record<string, unknown>) => {
          const row = rowRaw as unknown as InventoryItem & { category?: { name?: string }; users?: { full_name?: string } }
          return {
            id: row.id,
            name: row.name,
            unit: row.unit,
            current_stock: row.current_stock,
            minimum_stock: row.minimum_stock,
            category_name: row.category?.name || null,
            status: getStatus(row.current_stock, row.minimum_stock),
            created_by_name: row.users?.full_name || "Unknown",
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        })
    },

    async getStats(clinicId: string): Promise<{ total: number; lowStock: number; outOfStock: number }> {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("current_stock, minimum_stock")
        .eq("clinic_id", clinicId)
      if (error) throw error

      const items = (data || []) as { current_stock: number; minimum_stock: number }[]
      return {
        total: items.length,
        lowStock: items.filter((i) => i.current_stock > 0 && i.current_stock <= i.minimum_stock).length,
        outOfStock: items.filter((i) => i.current_stock <= 0).length,
      }
    },
  }
}
