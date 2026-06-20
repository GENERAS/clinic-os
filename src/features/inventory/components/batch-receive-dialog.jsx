"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { batchReceiveSchema } from "../schemas";
export function BatchReceiveDialog({ open, onClose, onSubmit }) {
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        resolver: zodResolver(batchReceiveSchema),
        defaultValues: {
            batch_number: "",
            expiry_date: "",
            quantity: undefined,
            cost_price: "",
            notes: "",
        },
    });
    const handleFormSubmit = async (values) => {
        setSaving(true);
        try {
            await onSubmit(values);
            reset();
            onClose();
        }
        catch {
        }
        finally {
            setSaving(false);
        }
    };
    if (!open) return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Receive New Batch</h2>
        <p className="mt-1 text-sm text-muted-foreground">Record a new batch/lot of inventory items.</p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="batch_number" className="mb-1.5 block text-sm font-medium">Batch/Lot Number *</label>
            <input id="batch_number" type="text" placeholder="e.g. BATCH-001" {...register("batch_number")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.batch_number && <p className="mt-1 text-xs text-destructive">{errors.batch_number.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiry_date" className="mb-1.5 block text-sm font-medium">Expiry Date *</label>
              <input id="expiry_date" type="date" {...register("expiry_date")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.expiry_date && <p className="mt-1 text-xs text-destructive">{errors.expiry_date.message}</p>}
            </div>
            <div>
              <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium">Quantity *</label>
              <input id="quantity" type="number" min="1" step="1" placeholder="0" {...register("quantity")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.quantity && <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="cost_price" className="mb-1.5 block text-sm font-medium">Cost Price (RWF)</label>
            <input id="cost_price" type="number" min="0" step="0.01" placeholder="0" {...register("cost_price")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.cost_price && <p className="mt-1 text-xs text-destructive">{errors.cost_price.message}</p>}
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">Notes</label>
            <textarea id="notes" rows={2} placeholder="e.g. Supplier, invoice reference" {...register("notes")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin"/>}
              {saving ? "Saving..." : "Receive Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
