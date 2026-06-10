"use client"

import Link from "next/link"
import { Calendar, Clock, User } from "lucide-react"
import { AppointmentStatusBadge } from "./appointment-status-badge"
import { QuickActions } from "./quick-actions"
import type { AppointmentWithRelations } from "../types"

interface AppointmentTableProps {
  appointments: AppointmentWithRelations[]
  clinicId: string
  userId: string
  onStatusChange: (id: string, status: string) => Promise<void>
}

export function AppointmentTable({ appointments, clinicId, userId, onStatusChange }: AppointmentTableProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">No appointments found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Patient</th>
            <th className="px-4 py-3 text-left font-medium">Doctor</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Date & Time</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Created By</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {appointments.map((apt) => (
            <tr key={apt.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link href={`/appointments/${apt.id}`} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {apt.patient_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{apt.patient_name}</p>
                    {apt.patient_phone && (
                      <p className="text-xs text-muted-foreground">{apt.patient_phone}</p>
                    )}
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>{apt.doctor.full_name}</span>
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="size-3 text-muted-foreground" />
                    {new Date(apt.appointment_date + "T00:00:00").toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {apt.start_time.substring(0, 5)} - {apt.end_time.substring(0, 5)}
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <AppointmentStatusBadge status={apt.status} />
              </td>
              <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                {apt.creator.full_name}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <QuickActions
                    appointmentId={apt.id}
                    currentStatus={apt.status}
                    onAction={onStatusChange}
                  />
                  <Link
                    href={`/appointments/${apt.id}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
