"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reminderSettingsSchema } from "../schemas";
import { REMINDER_HOURS_OPTIONS } from "../types";
export function ReminderSettingsCard({ settings, onSave }) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { register, handleSubmit, reset, watch, formState: { errors, isDirty }, } = useForm({
        resolver: zodResolver(reminderSettingsSchema),
        values: settings || { whatsapp_reminders_enabled: false, reminder_hours_before: 24 },
    });
    const enabled = watch("whatsapp_reminders_enabled");
    const onSubmit = async (values) => {
        setSaving(true);
        try {
            await onSave(values);
            setSaved(true);
            reset(values);
            setTimeout(() => setSaved(false), 3000);
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Appointment Reminders</h3>
      <p className="mt-1 text-xs text-slate-500">Configure automated WhatsApp reminders for upcoming appointments</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Enable Reminders</p>
            <p className="text-xs text-slate-500">
              Automatically send WhatsApp reminders before appointments
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" {...register("whatsapp_reminders_enabled")}/>
            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white"/>
          </label>
        </div>

        {enabled && (<div>
            <label className="text-sm font-medium text-slate-900">
              Remind before
            </label>
            <select {...register("reminder_hours_before", { valueAsNumber: true })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              {REMINDER_HOURS_OPTIONS.map((hours) => (<option key={hours} value={hours}>
                  {hours} hour{hours > 1 ? "s" : ""} before
                </option>))}
            </select>
            {errors.reminder_hours_before && (<p className="mt-1 text-xs text-red-500">{errors.reminder_hours_before.message}</p>)}
          </div>)}

        {errors.whatsapp_reminders_enabled && (<p className="text-xs text-red-500">{errors.whatsapp_reminders_enabled.message}</p>)}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && !isDirty && (<span className="text-sm text-emerald-600">Saved</span>)}
        </div>
      </form>
    </div>);
}
