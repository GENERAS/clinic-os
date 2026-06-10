"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getAppointmentService } from "@/features/appointments/services/appointment.service"
import { AppointmentCalendar } from "@/features/appointments/components/appointment-calendar"
import type { AppointmentWithRelations } from "@/features/appointments/types"
import { toast } from "sonner"

type CalendarView = "day" | "week" | "month"

export default function CalendarPage() {
  const router = useRouter()
  const { clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>("month")
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const service = useMemo(() => getAppointmentService(), [])

  const loadAppointments = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      let dateFrom: string
      let dateTo: string

      if (view === "month") {
        dateFrom = format(startOfMonth(currentDate), "yyyy-MM-dd")
        dateTo = format(endOfMonth(currentDate), "yyyy-MM-dd")
      } else if (view === "week") {
        const monday = new Date(currentDate)
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        const sunday = new Date(monday)
        sunday.setDate(sunday.getDate() + 6)
        dateFrom = format(monday, "yyyy-MM-dd")
        dateTo = format(sunday, "yyyy-MM-dd")
      } else {
        dateFrom = format(currentDate, "yyyy-MM-dd")
        dateTo = format(currentDate, "yyyy-MM-dd")
      }

      const data = await service.getCalendarAppointments(clinicId, dateFrom, dateTo)
      setAppointments(data)
    } catch {
      toast.error("Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }, [clinicId, service, currentDate, view])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const handleAppointmentClick = (id: string) => {
    router.push(`/appointments/${id}`)
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AppointmentCalendar
          appointments={appointments}
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onAppointmentClick={handleAppointmentClick}
        />
      )}
    </div>
  )
}
