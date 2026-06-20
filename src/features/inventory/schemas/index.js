import { z } from "zod";
export const createInventoryItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    category_id: z.string().optional().nullable(),
    unit: z.string().min(1, "Unit is required").max(50),
    current_stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
    minimum_stock: z.coerce.number().int().min(0, "Minimum stock cannot be negative"),
    description: z.string().optional().nullable(),
});
export const updateInventoryItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    category_id: z.string().optional().nullable(),
    unit: z.string().min(1, "Unit is required").max(50),
    minimum_stock: z.coerce.number().int().min(0, "Minimum stock cannot be negative"),
    description: z.string().optional().nullable(),
});
export const stockAdjustmentSchema = z.object({
    type: z.enum(["stock_in", "stock_out", "adjustment", "expired"]),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    reason: z.string().optional().nullable(),
});
export const batchReceiveSchema = z.object({
    batch_number: z.string().min(1, "Batch/Lot number is required").max(100),
    expiry_date: z.string().min(1, "Expiry date is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    cost_price: z.coerce.number().min(0, "Cost price cannot be negative").optional().nullable(),
    notes: z.string().optional().nullable(),
});
