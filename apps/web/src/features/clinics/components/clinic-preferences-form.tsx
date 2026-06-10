"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Settings2 } from "lucide-react"
import { SectionCard } from "@/components/shared/section-card"
import { preferencesSchema, type PreferencesFormValues } from "../schemas/preferences.schema"
import type { ClinicPreference } from "@/types/database"

interface ClinicPreferencesFormProps {
  preferences: ClinicPreference | null
  isOwner: boolean
  onSave: (values: PreferencesFormValues) => Promise<void>
}

export function ClinicPreferencesForm({ preferences, isOwner, onSave }: ClinicPreferencesFormProps) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      currency: preferences?.currency ?? "RWF",
      date_format: preferences?.date_format ?? "DD/MM/YYYY",
      time_format: (preferences?.time_format as "12h" | "24h") ?? "24h",
      language: preferences?.language ?? "en",
    },
  })

  useEffect(() => {
    reset({
      currency: preferences?.currency ?? "RWF",
      date_format: preferences?.date_format ?? "DD/MM/YYYY",
      time_format: (preferences?.time_format as "12h" | "24h") ?? "24h",
      language: preferences?.language ?? "en",
    })
  }, [preferences, reset])

  const onSubmit = async (values: PreferencesFormValues) => {
    setSaving(true)
    setSuccess(false)
    try {
      await onSave(values)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Clinic Preferences"
      description="System-wide configuration defaults"
      actions={
        !isOwner && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Settings2 className="size-3" /> View only
          </span>
        )
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="currency" className="mb-1.5 block text-sm font-medium">
              Currency
            </label>
            <select
              id="currency"
              {...register("currency")}
              disabled={!isOwner}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="RWF">RWF - Rwandan Franc</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="TZS">TZS - Tanzanian Shilling</option>
              <option value="UGX">UGX - Ugandan Shilling</option>
              <option value="NGN">NGN - Nigerian Naira</option>
            </select>
            {errors.currency && <p className="mt-1 text-xs text-destructive">{errors.currency.message}</p>}
          </div>

          <div>
            <label htmlFor="language" className="mb-1.5 block text-sm font-medium">
              Language
            </label>
            <select
              id="language"
              {...register("language")}
              disabled={!isOwner}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="rw">Kinyarwanda</option>
              <option value="sw">Swahili</option>
            </select>
            {errors.language && <p className="mt-1 text-xs text-destructive">{errors.language.message}</p>}
          </div>

          <div>
            <label htmlFor="date_format" className="mb-1.5 block text-sm font-medium">
              Date Format
            </label>
            <select
              id="date_format"
              {...register("date_format")}
              disabled={!isOwner}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
            {errors.date_format && <p className="mt-1 text-xs text-destructive">{errors.date_format.message}</p>}
          </div>

          <div>
            <label htmlFor="time_format" className="mb-1.5 block text-sm font-medium">
              Time Format
            </label>
            <select
              id="time_format"
              {...register("time_format")}
              disabled={!isOwner}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="24h">24-hour</option>
              <option value="12h">12-hour (AM/PM)</option>
            </select>
            {errors.time_format && <p className="mt-1 text-xs text-destructive">{errors.time_format.message}</p>}
          </div>
        </div>

        {isOwner && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {success && <span className="text-sm text-green-600">Saved successfully</span>}
          </div>
        )}
      </form>
    </SectionCard>
  )
}
