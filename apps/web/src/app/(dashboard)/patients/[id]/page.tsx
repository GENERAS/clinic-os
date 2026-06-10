"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, User, MessageSquare, Calendar, Edit } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getPatientService } from "@/features/patients/services/patient.service"
import { PatientProfileHeader } from "@/features/patients/components/patient-profile-header"
import { PatientNotes } from "@/features/patients/components/patient-notes"
import { PatientAppointmentsList } from "@/features/patients/components/patient-appointments-list"
import type { PatientWithStats } from "@/features/patients/types"
import { toast } from "sonner"

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [patient, setPatient] = useState<PatientWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<{ id: string; content: string; author_name: string; created_at: string }[]>([])

  const service = useMemo(() => getPatientService(), [])

  const loadPatient = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await service.getPatientById(clinicId, id)
      setPatient(data)
      if (data) {
        const patientNotes = await service.getPatientNotes(clinicId, id)
        setNotes(patientNotes)
      }
    } catch {
      toast.error("Failed to load patient")
    } finally {
      setLoading(false)
    }
  }, [clinicId, id, service])

  useEffect(() => {
    loadPatient()
  }, [loadPatient])

  const handleAddNote = async (content: string) => {
    if (!clinicId || !user) return
    try {
      await service.addPatientNote(clinicId, id, content, user.id)
      toast.success("Note added")
      const patientNotes = await service.getPatientNotes(clinicId, id)
      setNotes(patientNotes)
    } catch {
      toast.error("Failed to add note")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient Not Found">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Patients
          </Link>
        </PageHeader>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            This patient does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Patient Profile">
        <div className="flex items-center gap-2">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </PageHeader>

      <PatientProfileHeader patient={patient} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Emergency Contact */}
        {patient.emergency_contact_name && (
          <SectionCard title="Emergency Contact" icon={<User className="size-4" />}>
            <div className="space-y-1">
              <p className="text-sm font-medium">{patient.emergency_contact_name}</p>
              {patient.emergency_contact_phone && (
                <p className="text-xs text-muted-foreground">{patient.emergency_contact_phone}</p>
              )}
            </div>
          </SectionCard>
        )}

        {/* Created Info */}
        <SectionCard title="Record Info">
          <p className="text-xs text-muted-foreground">
            Created {new Date(patient.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(patient.updated_at).toLocaleString()}
          </p>
        </SectionCard>
      </div>

      {/* Patient Notes */}
      {patient.notes && (
        <SectionCard title="General Notes" icon={<Edit className="size-4" />}>
          <p className="text-sm">{patient.notes}</p>
        </SectionCard>
      )}

      {/* Appointment History */}
      <SectionCard title="Appointment History" icon={<Calendar className="size-4" />}>
        {clinicId && <PatientAppointmentsList clinicId={clinicId} patientId={id} />}
      </SectionCard>

      {/* Internal Notes */}
      <SectionCard title="Internal Notes" icon={<MessageSquare className="size-4" />}>
        {clinicId && (
          <PatientNotes notes={notes} onAddNote={handleAddNote} />
        )}
      </SectionCard>
    </div>
  )
}
