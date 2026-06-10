"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Calendar, Clock, User, Stethoscope, FileText, RefreshCw } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getAppointmentService } from "@/features/appointments/services/appointment.service"
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge"
import { AppointmentTimeline } from "@/features/appointments/components/appointment-timeline"
import { AppointmentNotes } from "@/features/appointments/components/appointment-notes"
import { QuickActions } from "@/features/appointments/components/quick-actions"
import { RescheduleDialog } from "@/features/appointments/components/reschedule-dialog"
import type { AppointmentWithRelations } from "@/features/appointments/types"
import { toast } from "sonner"

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReschedule, setShowReschedule] = useState(false)

  const service = useMemo(() => getAppointmentService(), [])

  const loadAppointment = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await service.getAppointment(clinicId, id)
      setAppointment(data)
    } catch {
      toast.error("Failed to load appointment")
    } finally {
      setLoading(false)
    }
  }, [clinicId, id, service])

  useEffect(() => {
    loadAppointment()
  }, [loadAppointment])

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    if (!clinicId || !user) return
    try {
      await service.changeStatus(clinicId, appointmentId, newStatus as never, user.id)
      toast.success(`Appointment ${newStatus}`)
      await loadAppointment()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const handleAddNote = async (content: string) => {
    if (!clinicId || !user) return
    try {
      await service.addNote(clinicId, id, content, user.id)
      toast.success("Note added")
      await loadAppointment()
    } catch {
      toast.error("Failed to add note")
    }
  }

  const handleReschedule = async (values: { appointment_date: string; start_time: string; end_time: string }) => {
    if (!clinicId || !user) return
    try {
      await service.rescheduleAppointment(clinicId, id, values, user.id)
      toast.success("Appointment rescheduled")
      setShowReschedule(false)
      await loadAppointment()
    } catch (err) {
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointment Not Found">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Appointments
          </Link>
        </PageHeader>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            This appointment does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`${appointment.patient_name} — ${appointment.appointment_date}`}>
        <div className="flex items-center gap-2">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </PageHeader>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
        <AppointmentStatusBadge status={appointment.status} className="text-sm" />
        <QuickActions
          appointmentId={appointment.id}
          currentStatus={appointment.status}
          onAction={handleStatusChange}
        />
        <button
          onClick={() => setShowReschedule(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className="size-3.5" />
          Reschedule
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Info */}
        <SectionCard title="Patient" icon={<User className="size-4" />}>
          <div className="space-y-2">
            <div>
              {appointment.patient_id ? (
                <Link href={`/patients/${appointment.patient_id}`} className="text-sm font-medium text-primary hover:underline">
                  {appointment.patient_name}
                </Link>
              ) : (
                <p className="text-sm font-medium">{appointment.patient_name}</p>
              )}
              {appointment.patient_phone && (
                <p className="text-xs text-muted-foreground">{appointment.patient_phone}</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Doctor Info */}
        <SectionCard title="Doctor" icon={<Stethoscope className="size-4" />}>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {appointment.doctor.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{appointment.doctor.full_name}</p>
              <p className="text-xs text-muted-foreground">Assigned Doctor</p>
            </div>
          </div>
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Date & Time" icon={<Calendar className="size-4" />}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              {new Date(appointment.appointment_date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {appointment.start_time.substring(0, 5)} — {appointment.end_time.substring(0, 5)}
            </div>
          </div>
        </SectionCard>

        {/* Created By */}
        <SectionCard title="Created By" icon={<User className="size-4" />}>
          <p className="text-sm font-medium">{appointment.creator.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(appointment.created_at).toLocaleString()}
          </p>
        </SectionCard>
      </div>

      {/* Reason */}
      {appointment.reason && (
        <SectionCard title="Reason for Visit" icon={<FileText className="size-4" />}>
          <p className="text-sm">{appointment.reason}</p>
        </SectionCard>
      )}

      {/* Status Timeline */}
      <SectionCard title="Status Timeline">
        <AppointmentTimeline history={appointment.status_history} />
      </SectionCard>

      {/* Notes */}
      <SectionCard title="Notes">
        <AppointmentNotes notes={appointment.appointmentNotes} onAddNote={handleAddNote} />
      </SectionCard>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
        onReschedule={handleReschedule}
        currentDate={appointment.appointment_date}
        currentStartTime={appointment.start_time}
        currentEndTime={appointment.end_time}
      />
    </div>
  )
}
