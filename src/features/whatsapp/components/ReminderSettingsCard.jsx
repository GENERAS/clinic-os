"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reminderSettingsSchema } from "../schemas";
import { REMINDER_HOURS_OPTIONS } from "../types";
import { PageHeader } from "@/components/shared/page-header";
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
    return (<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <PageHeader title="Appointment Reminders" description="Configure automated WhatsApp reminders for upcoming appointments" className="mb-6"/>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Reminders</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automatically send WhatsApp reminders before appointments
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" {...register("whatsapp_reminders_enabled")}/>
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"/>
          </label>
        </div>

        {enabled && (<div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Remind before
            </label>
            <select {...register("reminder_hours_before", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              {REMINDER_HOURS_OPTIONS.map((hours) => (<option key={hours} value={hours}>
                  {hours} hour{hours > 1 ? "s" : ""} before
                </option>))}
            </select>
            {errors.reminder_hours_before && (<p className="mt-1 text-xs text-red-500">{errors.reminder_hours_before.message}</p>)}
          </div>)}

        {errors.whatsapp_reminders_enabled && (<p className="text-xs text-red-500">{errors.whatsapp_reminders_enabled.message}</p>)}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && !isDirty && (<span className="text-sm text-green-600 dark:text-green-400">Saved</span>)}
        </div>
      </form>
    </div>);
}
