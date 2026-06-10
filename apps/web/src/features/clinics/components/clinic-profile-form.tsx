"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { clinicProfileSchema, type ClinicProfileFormValues } from "../schemas/clinic-profile.schema"
import type { Clinic } from "@/types/database"

interface ClinicProfileFormProps {
  clinic: Clinic | null
  isLoading: boolean
  onSave: (values: ClinicProfileFormValues) => Promise<void>
}

export function ClinicProfileForm({ clinic, isLoading, onSave }: ClinicProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ClinicProfileFormValues>({
    resolver: zodResolver(clinicProfileSchema),
    values: {
      name: clinic?.name ?? "",
      email: clinic?.email ?? "",
      phone: clinic?.phone ?? "",
      alternative_phone: clinic?.alternative_phone ?? "",
      website: clinic?.website ?? "",
      description: clinic?.description ?? "",
      timezone: clinic?.timezone ?? "UTC",
    },
  })

  useEffect(() => {
    if (clinic) {
      reset({
        name: clinic.name ?? "",
        email: clinic.email ?? "",
        phone: clinic.phone ?? "",
        alternative_phone: clinic.alternative_phone ?? "",
        website: clinic.website ?? "",
        description: clinic.description ?? "",
        timezone: clinic.timezone ?? "UTC",
      })
    }
  }, [clinic, reset])

  const onSubmit = async (values: ClinicProfileFormValues) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Clinic Name</label>
        <input
          {...register("name")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            {...register("email")}
            type="email"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <input
            {...register("phone")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Alternative Phone</label>
          <input
            {...register("alternative_phone")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Website</label>
          <input
            {...register("website")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {success && (
          <span className="text-sm text-green-600">Changes saved successfully</span>
        )}
      </div>
    </form>
  )
}
