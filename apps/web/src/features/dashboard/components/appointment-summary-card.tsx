"use client"

import Link from "next/link"
import { Clock, User, Check, X, ArrowRight, Loader2 } from "lucide-react"
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge"
import type { TodayAppointment, UpcomingAppointment } from "../types"
import type { AppointmentStatus } from "@/features/appointments/types"

interface AppointmentSummaryCardProps {
  todayAppointments: TodayAppointment[]
  upcomingAppointments: UpcomingAppointment[]
  onStatusChange?: (appointmentId: string, newStatus: AppointmentStatus) => Promise<void>
  loadingStatus?: string | null
}

export function AppointmentSummaryCard({
  todayAppointments,
  upcomingAppointments,
  onStatusChange,
  loadingStatus,
}: AppointmentSummaryCardProps) {
  const statusCounts = {
    scheduled: todayAppointments.filter((a) => a.status === "scheduled").length,
    confirmed: todayAppointments.filter((a) => a.status === "confirmed").length,
    arrived: todayAppointments.filter((a) => a.status === "arrived").length,
    in_progress: todayAppointments.filter((a) => a.status === "in_progress").length,
    completed: todayAppointments.filter((a) => a.status === "completed").length,
    cancelled: todayAppointments.filter((a) => a.status === "cancelled").length,
    no_show: todayAppointments.filter((a) => a.status === "no_show").length,
  }

  if (todayAppointments.length === 0 && upcomingAppointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Clock className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No appointments scheduled</p>
        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <User className="size-3.5" />
          Book an appointment
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Scheduled", count: statusCounts.scheduled, color: "text-blue-600" },
          { label: "Arrived", count: statusCounts.arrived, color: "text-emerald-600" },
          { label: "Progress", count: statusCounts.in_progress, color: "text-amber-600" },
          { label: "Done", count: statusCounts.completed, color: "text-slate-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-2 text-center">
            <p className={`text-lg font-semibold tabular-nums ${item.color}`}>{item.count}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Today's timeline */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Today — {todayAppointments.length} appointment{todayAppointments.length !== 1 ? "s" : ""}
        </p>
        {todayAppointments.slice(0, 5).map((apt) => (
          <div
            key={apt.id}
            className="flex items-center gap-2 rounded-lg border p-2.5 text-sm"
          >
            <div className="min-w-[48px] text-xs font-medium tabular-nums text-muted-foreground">
              {apt.start_time.substring(0, 5)}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/patients/${apt.patient_id}`}
                className="truncate font-medium hover:underline"
              >
                {apt.patient_name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{apt.doctor_name}</p>
            </div>
            <div className="flex items-center gap-1">
              <AppointmentStatusBadge status={apt.status} />
              {onStatusChange && apt.status === "scheduled" && (
                <button
                  onClick={() => onStatusChange(apt.id, "confirmed")}
                  disabled={loadingStatus === apt.id}
                  className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/30"
                  title="Confirm"
                >
                  {loadingStatus === apt.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </button>
              )}
              {onStatusChange && apt.status === "confirmed" && (
                <button
                  onClick={() => onStatusChange(apt.id, "arrived")}
                  disabled={loadingStatus === apt.id}
                  className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/30"
                  title="Mark arrived"
                >
                  {loadingStatus === apt.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {todayAppointments.length > 5 && (
          <Link
            href="/appointments/today"
            className="block text-center text-xs font-medium text-primary hover:underline"
          >
            View all {todayAppointments.length}
          </Link>
        )}
      </div>

      {/* Upcoming */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Upcoming — next {Math.min(upcomingAppointments.length, 3)}
          </p>
          {upcomingAppointments.slice(0, 3).map((apt) => (
            <Link
              key={apt.id}
              href={`/appointments/${apt.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/30"
            >
              <div className="min-w-[80px] text-xs tabular-nums text-muted-foreground">
                {new Date(apt.appointment_date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{apt.patient_name}</p>
                <p className="truncate text-xs text-muted-foreground">{apt.doctor_name}</p>
              </div>
              <AppointmentStatusBadge status={apt.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
