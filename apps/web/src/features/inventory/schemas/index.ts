import { z } from "zod"

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category_id: z.string().optional().nullable(),
  unit: z.string().min(1, "Unit is required").max(50),
  current_stock: z.number().int().min(0, "Stock cannot be negative"),
  minimum_stock: z.number().int().min(0, "Minimum stock cannot be negative"),
  description: z.string().optional().nullable(),
})

export type CreateInventoryItemFormValues = z.infer<typeof createInventoryItemSchema>

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category_id: z.string().optional().nullable(),
  unit: z.string().min(1, "Unit is required").max(50),
  minimum_stock: z.number().int().min(0, "Minimum stock cannot be negative"),
  description: z.string().optional().nullable(),
})

export type UpdateInventoryItemFormValues = z.infer<typeof updateInventoryItemSchema>

export const stockAdjustmentSchema = z.object({
  type: z.enum(["stock_in", "stock_out", "adjustment", "expired"]),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().optional().nullable(),
})

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>
