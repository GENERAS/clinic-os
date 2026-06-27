"use client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { AppointmentCalendar } from "@/features/appointments/components/appointment-calendar";
import { AppointmentFilters } from "@/features/appointments/components/appointment-filters";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctors, setDoctors] = useState([]);

  const { appointments, status } = useRealtimeAppointments(clinicId);
  const service = useMemo(() => getAppointmentService(), []);

  useEffect(() => {
    if (!clinicId) return;
    service.getDoctors(clinicId).then(setDoctors).catch(() => {});
  }, [clinicId, service]);

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
    return appointments.filter((a) => {
      if (a.appointment_date < dateFrom || a.appointment_date > dateTo) return false;
      if (doctorFilter && a.doctor_id !== doctorFilter && a.doctor?.id !== doctorFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = a.patient_name?.toLowerCase().includes(q);
        const phoneMatch = a.patient_phone?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [appointments, currentDate, view, search, doctorFilter, statusFilter]);

  const handleAppointmentClick = (id) => {
    navigate(`/appointments/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <RealtimeStatusBadge status={status}/>
      </div>
      <AppointmentFilters search={search} onSearchChange={setSearch} doctorId={doctorFilter} onDoctorChange={setDoctorFilter} status={statusFilter} onStatusChange={setStatusFilter} doctors={doctors}/>
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
