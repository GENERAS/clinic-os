"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { AppointmentCalendar } from "@/features/appointments/components/appointment-calendar";
import { AppointmentFilters } from "@/features/appointments/components/appointment-filters";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const userId = user?.id;
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

  const handleAppointmentClick = useCallback((id) => {
    navigate(`/appointments/${id}`);
  }, [navigate]);

  const handleSlotClick = useCallback((dateStr, hour) => {
    const params = new URLSearchParams({ date: dateStr });
    if (hour) params.set("hour", hour);
    navigate(`/appointments/new?${params.toString()}`);
  }, [navigate]);

  const handleReschedule = useCallback(async (appointmentId, newDate, newStartTime, newEndTime) => {
    if (!clinicId || !userId) return;
    try {
      await service.rescheduleAppointment(clinicId, appointmentId, {
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      }, userId);
      toast.success("Appointment rescheduled");
    } catch (err) {
      toast.error(err.message || "Failed to reschedule appointment");
    }
  }, [clinicId, userId, service]);

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
        onSlotClick={handleSlotClick}
        onReschedule={handleReschedule}
      />
    </div>
  );
}
