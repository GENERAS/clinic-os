"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Loader2, Calendar } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getAppointmentService } from "@/features/appointments/services/appointment.service"
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge"
import type { AppointmentWithRelations } from "@/features/appointments/types"
import { toast } from "sonner"

export default function TodayAppointmentsPage() {
  const { user, clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const service = useMemo(() => getAppointmentService(), [])

  const loadAppointments = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await service.getTodayAppointments(clinicId)
      setAppointments(data)
    } catch {
      toast.error("Failed to load today's appointments")
    } finally {
      setLoading(false)
    }
  }, [clinicId, service])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const groups = useMemo(() => {
    const upcoming = appointments.filter(
      (a) => a.status === "scheduled" || a.status === "confirmed"
    )
    const inProgress = appointments.filter((a) => a.status === "arrived" || a.status === "in_progress")
    const completed = appointments.filter((a) => a.status === "completed")
    const cancelled = appointments.filter((a) => a.status === "cancelled")
    const noShow = appointments.filter((a) => a.status === "no_show")
    return { upcoming, inProgress, completed, cancelled, noShow }
  }, [appointments])

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    if (!clinicId || !user) return
    try {
      await service.changeStatus(clinicId, appointmentId, newStatus as never, user.id)
      toast.success(`Appointment ${newStatus}`)
      await loadAppointments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Today's Appointments" description={today}>
        <div className="flex items-center gap-2">
          <Link
            href="/appointments/calendar"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Calendar className="size-4" />
            Calendar
          </Link>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            New Appointment
          </Link>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Upcoming */}
          <SectionCard title={`Upcoming (${groups.upcoming.length})`} className="md:col-span-2 lg:col-span-3">
            {groups.upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No upcoming appointments</p>
            ) : (
              <div className="divide-y">
                {groups.upcoming.map((apt) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* In Progress */}
          <SectionCard title={`In Progress (${groups.inProgress.length})`}>
            {groups.inProgress.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">None in progress</p>
            ) : (
              <div className="divide-y">
                {groups.inProgress.map((apt) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Completed */}
          <SectionCard title={`Completed (${groups.completed.length})`}>
            {groups.completed.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">None completed</p>
            ) : (
              <div className="divide-y">
                {groups.completed.map((apt) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Cancelled & No Show */}
          <SectionCard title={`Cancelled / No Show (${groups.cancelled.length + groups.noShow.length})`}>
            {groups.cancelled.length === 0 && groups.noShow.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">None cancelled</p>
            ) : (
              <div className="divide-y">
                {[...groups.cancelled, ...groups.noShow].map((apt) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function AppointmentRow({
  appointment: apt,
  onStatusChange,
}: {
  appointment: AppointmentWithRelations
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  return (
    <Link
      href={`/appointments/${apt.id}`}
      className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {apt.patient_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{apt.patient_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {apt.start_time.substring(0, 5)} — {apt.end_time.substring(0, 5)} | {apt.doctor.full_name}
        </p>
      </div>
      <AppointmentStatusBadge status={apt.status} />
    </Link>
  )
}
