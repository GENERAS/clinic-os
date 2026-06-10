export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock"

export interface InventoryItemSummary {
  id: string
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  category_name: string | null
  status: InventoryStatus
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface InventoryItemWithDetails {
  id: string
  clinic_id: string
  category_id: string | null
  category_name: string | null
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  description: string | null
  status: InventoryStatus
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface InventoryTransactionWithUser {
  id: string
  inventory_item_id: string
  type: "stock_in" | "stock_out" | "adjustment" | "expired"
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  performed_by_name: string
  created_at: string
}

export interface StockAdjustmentValues {
  type: "stock_in" | "stock_out" | "adjustment" | "expired"
  quantity: number
  reason?: string | null
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  adjustment: "Adjustment",
  expired: "Expired",
}
