"use client";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { AppointmentCalendar } from "@/features/appointments/components/appointment-calendar";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");

  const { appointments, status } = useRealtimeAppointments(clinicId);

  const visibleAppointments = useMemo(() => {
    let dateFrom, dateTo;
    if (view === "month") {
      dateFrom = format(startOfMonth(currentDate), "yyyy-MM-dd");
      dateTo = format(endOfMonth(currentDate), "yyyy-MM-dd");
    } else if (view === "week") {
      const monday = new Date(currentDate);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      dateFrom = format(monday, "yyyy-MM-dd");
      dateTo = format(sunday, "yyyy-MM-dd");
    } else {
      dateFrom = format(currentDate, "yyyy-MM-dd");
      dateTo = format(currentDate, "yyyy-MM-dd");
    }
    return appointments.filter((a) => a.appointment_date >= dateFrom && a.appointment_date <= dateTo);
  }, [appointments, currentDate, view]);

  const handleAppointmentClick = (id) => {
    navigate(`/appointments/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <RealtimeStatusBadge status={status}/>
      </div>
      <AppointmentCalendar
        appointments={visibleAppointments}
        currentDate={currentDate}
        view={view}
        onDateChange={setCurrentDate}
        onViewChange={setView}
        onAppointmentClick={handleAppointmentClick}
      />
    </div>
  );
}
