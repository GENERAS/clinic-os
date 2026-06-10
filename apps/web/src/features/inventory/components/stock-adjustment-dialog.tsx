"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "../schemas"
import { TRANSACTION_TYPE_LABELS } from "../types"

interface StockAdjustmentDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: StockAdjustmentFormValues) => Promise<void>
}

export function StockAdjustmentDialog({ open, onClose, onSubmit }: StockAdjustmentDialogProps) {
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      type: undefined,
      quantity: undefined,
      reason: "",
    },
  })

  const selectedType = watch("type")

  const handleFormSubmit = async (values: StockAdjustmentFormValues) => {
    setSaving(true)
    try {
      await onSubmit(values)
      reset()
      onClose()
    } catch {
      // error handled by parent
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Adjust Stock</h2>
        <p className="mt-1 text-sm text-muted-foreground">Record a stock movement transaction.</p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium">Type *</label>
            <select
              id="type"
              {...register("type")}
              disabled={saving}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">Select type</option>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div>
            <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium">
              {selectedType === "stock_in" ? "Quantity to Add *" :
               selectedType === "adjustment" ? "New Stock Count *" :
               "Quantity to Remove *"}
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              {...register("quantity")}
              disabled={saving}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
            {errors.quantity && <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p>}
            {selectedType === "adjustment" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the actual current stock count to correct inventory.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Reason</label>
            <input
              id="reason"
              type="text"
              placeholder={
                selectedType === "stock_in" ? "e.g. Supplier delivery" :
                selectedType === "stock_out" ? "e.g. Dispensed to patient" :
                selectedType === "expired" ? "e.g. Expired batch" :
                "e.g. Counting correction"
              }
              {...register("reason")}
              disabled={saving}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
