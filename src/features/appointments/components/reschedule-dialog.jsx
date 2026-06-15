"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, RefreshCw } from "lucide-react";
import { rescheduleAppointmentSchema } from "../schemas";
export function RescheduleDialog({ open, onClose, onReschedule, currentDate, currentStartTime, currentEndTime, }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const { register, handleSubmit, formState: { errors }, } = useForm({
        resolver: zodResolver(rescheduleAppointmentSchema),
        defaultValues: {
            appointment_date: currentDate,
            start_time: currentStartTime.substring(0, 5),
            end_time: currentEndTime.substring(0, 5),
        },
    });
    if (!open)
        return null;
    const onSubmit = async (values) => {
        setSaving(true);
        setError(null);
        try {
            await onReschedule(values);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reschedule");
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-5"/>
            <h2 className="text-lg font-semibold">Reschedule Appointment</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1 hover:bg-muted">
            <X className="size-5"/>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="reschedule_date" className="mb-1.5 block text-sm font-medium">
              New Date *
            </label>
            <input id="reschedule_date" type="date" {...register("appointment_date")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.appointment_date && (<p className="mt-1 text-xs text-destructive">{errors.appointment_date.message}</p>)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="reschedule_start" className="mb-1.5 block text-sm font-medium">
                Start Time *
              </label>
              <input id="reschedule_start" type="time" {...register("start_time")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.start_time && (<p className="mt-1 text-xs text-destructive">{errors.start_time.message}</p>)}
            </div>
            <div>
              <label htmlFor="reschedule_end" className="mb-1.5 block text-sm font-medium">
                End Time *
              </label>
              <input id="reschedule_end" type="time" {...register("end_time")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.end_time && (<p className="mt-1 text-xs text-destructive">{errors.end_time.message}</p>)}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin"/>}
              {saving ? "Rescheduling..." : "Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
