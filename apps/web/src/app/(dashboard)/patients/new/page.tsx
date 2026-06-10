"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, User } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getPatientService } from "@/features/patients/services/patient.service"
import { createPatientSchema, type CreatePatientFormValues } from "@/features/patients/schemas"
import { toast } from "sonner"

export default function NewPatientPage() {
  const router = useRouter()
  const { user, clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      gender: null,
    },
  })

  const onSubmit = async (values: CreatePatientFormValues) => {
    if (!clinicId || !user) return
    setSaving(true)
    try {
      const patient = await getPatientService().createPatient(
        clinicId,
        {
          full_name: values.full_name,
          phone: values.phone,
          email: values.email || null,
          gender: values.gender || null,
          date_of_birth: values.date_of_birth || null,
          address: values.address || null,
          emergency_contact_name: values.emergency_contact_name || null,
          emergency_contact_phone: values.emergency_contact_phone || null,
          notes: values.notes || null,
        },
        user.id
      )
      toast.success("Patient created")
      router.push(`/patients/${patient.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create patient"
      const existsMatch = message.match(/^PATIENT_EXISTS:([^:]+):(.+)$/)
      if (existsMatch) {
        toast.error(`Patient "${existsMatch[2]}" already exists with this phone number`)
        router.push(`/patients/${existsMatch[1]}`)
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New Patient">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Patients
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <SectionCard title="Basic Information" icon={<User className="size-4" />}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">
                Full Name *
              </label>
              <input
                id="full_name"
                type="text"
                placeholder="Enter patient full name"
                {...register("full_name")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                Phone *
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                {...register("phone")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="patient@example.com"
                {...register("email")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">
                  Gender
                </label>
                <select
                  id="gender"
                  {...register("gender")}
                  disabled={saving}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="date_of_birth" className="mb-1.5 block text-sm font-medium">
                  Date of Birth
                </label>
                <input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth")}
                  disabled={saving}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
                Address
              </label>
              <input
                id="address"
                type="text"
                placeholder="Patient address"
                {...register("address")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </div>
        </SectionCard>

        {/* Emergency Contact */}
        <SectionCard title="Emergency Contact">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergency_contact_name" className="mb-1.5 block text-sm font-medium">
                Contact Name
              </label>
              <input
                id="emergency_contact_name"
                type="text"
                placeholder="Emergency contact name"
                {...register("emergency_contact_name")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="emergency_contact_phone" className="mb-1.5 block text-sm font-medium">
                Contact Phone
              </label>
              <input
                id="emergency_contact_phone"
                type="tel"
                placeholder="Emergency contact phone"
                {...register("emergency_contact_phone")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Additional Notes">
          <div>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any additional notes about the patient"
              {...register("notes")}
              disabled={saving}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/patients"
            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Creating..." : "Create Patient"}
          </button>
        </div>
      </form>
    </div>
  )
}
