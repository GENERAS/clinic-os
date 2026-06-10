"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isToday,
} from "date-fns"
import type { AppointmentWithRelations } from "../types"
import { AppointmentStatusBadge } from "./appointment-status-badge"

type CalendarView = "day" | "week" | "month"

interface AppointmentCalendarProps {
  appointments: AppointmentWithRelations[]
  currentDate: Date
  view: CalendarView
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onAppointmentClick: (id: string) => void
}

export function AppointmentCalendar({
  appointments,
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onAppointmentClick,
}: AppointmentCalendarProps) {
  const navigate = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1
    switch (view) {
      case "month":
        onDateChange(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
        break
      case "week":
        onDateChange(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
        break
      case "day":
        onDateChange(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1))
        break
    }
  }

  const goToday = () => onDateChange(new Date())

  const headerLabel = useMemo(() => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      }
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
    }
  }, [currentDate, view])

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return appointments.filter((apt) => apt.appointment_date === dateStr)
  }

  if (view === "month") {
    return (
      <MonthView
        currentDate={currentDate}
        appointments={appointments}
        navigate={navigate}
        headerLabel={headerLabel}
        goToday={goToday}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
        onAppointmentClick={onAppointmentClick}
        getAppointmentsForDay={getAppointmentsForDay}
      />
    )
  }

  if (view === "week") {
    return (
      <WeekView
        currentDate={currentDate}
        appointments={appointments}
        navigate={navigate}
        headerLabel={headerLabel}
        goToday={goToday}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
        onAppointmentClick={onAppointmentClick}
        getAppointmentsForDay={getAppointmentsForDay}
      />
    )
  }

  return (
    <DayView
      currentDate={currentDate}
      appointments={appointments}
      navigate={navigate}
      headerLabel={headerLabel}
      goToday={goToday}
      onViewChange={onViewChange}
      onDateChange={onDateChange}
      onAppointmentClick={onAppointmentClick}
      getAppointmentsForDay={getAppointmentsForDay}
    />
  )
}

interface ViewProps {
  currentDate: Date
  appointments: AppointmentWithRelations[]
  navigate: (direction: "prev" | "next") => void
  headerLabel: string
  goToday: () => void
  onViewChange: (view: CalendarView) => void
  onDateChange: (date: Date) => void
  onAppointmentClick: (id: string) => void
  getAppointmentsForDay: (date: Date) => AppointmentWithRelations[]
}

function CalendarHeader({ navigate, headerLabel, goToday, onViewChange, currentView }: {
  navigate: (d: "prev" | "next") => void
  headerLabel: string
  goToday: () => void
  onViewChange: (v: CalendarView) => void
  currentView: CalendarView
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("prev")}
          className="rounded-lg border p-1.5 hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="min-w-[180px] text-center text-lg font-semibold">{headerLabel}</h2>
        <button
          onClick={() => navigate("next")}
          className="rounded-lg border p-1.5 hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={goToday}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Today
        </button>
      </div>
      <div className="flex rounded-lg border">
        {(["month", "week", "day"] as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-3 py-1.5 text-sm font-medium capitalize first:rounded-l-lg last:rounded-r-lg ${
              currentView === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

function MonthView({
  currentDate, navigate, headerLabel, goToday, onViewChange, onDateChange, onAppointmentClick, getAppointmentsForDay,
}: ViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="space-y-4">
      <CalendarHeader
        navigate={navigate}
        headerLabel={headerLabel}
        goToday={goToday}
        onViewChange={onViewChange}
        currentView="month"
      />
      <div className="rounded-xl border">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {dayNames.map((name) => (
            <div key={name} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayApts = getAppointmentsForDay(day)
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const today = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onDateChange(day)
                  onViewChange("day")
                }}
                className={`min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/30 ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${today ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                    today ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayApts.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(apt.id)
                      }}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                        apt.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : apt.status === "cancelled" || apt.status === "no_show"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : apt.status === "in_progress"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {apt.start_time.substring(0, 5)} {apt.patient_name.split(" ")[0]}
                    </div>
                  ))}
                  {dayApts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">+{dayApts.length - 3} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeekView({
  currentDate, appointments, navigate, headerLabel, goToday, onViewChange, onDateChange, onAppointmentClick, getAppointmentsForDay,
}: ViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const hours = Array.from({ length: 14 }, (_, i) => i + 7)

  const getAppointmentsAtHour = (date: Date, hour: number) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return appointments.filter((apt) => {
      if (apt.appointment_date !== dateStr) return false
      const startHour = parseInt(apt.start_time.substring(0, 2), 10)
      const endHour = parseInt(apt.end_time.substring(0, 2), 10)
      return startHour <= hour && endHour > hour
    })
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        navigate={navigate}
        headerLabel={headerLabel}
        goToday={goToday}
        onViewChange={onViewChange}
        currentView="week"
      />
      <div className="overflow-x-auto rounded-xl border">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
            <div className="px-2 py-2" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`px-2 py-2 text-center text-xs font-medium ${
                  isToday(day) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div>{format(day, "EEE")}</div>
                <div
                  className={`mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm ${
                    isToday(day) ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {hours.map((hour) => (
              <>
                <div className="border-b border-r px-2 py-3 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {days.map((day) => {
                  const dayApts = getAppointmentsAtHour(day, hour)
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="min-h-[48px] border-b border-r p-0.5"
                    >
                      {dayApts.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => onAppointmentClick(apt.id)}
                          className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-medium text-left ${
                            apt.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                              : apt.status === "in_progress"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                              : apt.status === "cancelled" || apt.status === "no_show"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30"
                          }`}
                        >
                          {apt.patient_name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DayView({
  currentDate, appointments, navigate, headerLabel, goToday, onViewChange, onAppointmentClick, getAppointmentsForDay,
}: ViewProps) {
  const dayApts = getAppointmentsForDay(currentDate).sort(
    (a, b) => (a.start_time < b.start_time ? -1 : 1)
  )

  return (
    <div className="space-y-4">
      <CalendarHeader
        navigate={navigate}
        headerLabel={headerLabel}
        goToday={goToday}
        onViewChange={onViewChange}
        currentView="day"
      />
      <div className="rounded-xl border">
        {dayApts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No appointments for this day</p>
          </div>
        ) : (
          <div className="divide-y">
            {dayApts.map((apt) => (
              <button
                key={apt.id}
                onClick={() => onAppointmentClick(apt.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="min-w-[60px] text-center">
                  <div className="text-sm font-medium">{apt.start_time.substring(0, 5)}</div>
                  <div className="text-xs text-muted-foreground">{apt.end_time.substring(0, 5)}</div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {apt.patient_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{apt.patient_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {apt.doctor.full_name}
                    {apt.reason && ` — ${apt.reason}`}
                  </p>
                </div>
                <AppointmentStatusBadge status={apt.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
