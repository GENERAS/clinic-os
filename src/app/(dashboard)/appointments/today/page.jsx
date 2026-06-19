"use client";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, Phone, Clock, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { toast } from "sonner";

export default function TodayAppointmentsPage() {
  const { user, clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const service = getAppointmentService();

  const { appointments, loading, status } = useRealtimeAppointments(clinicId);

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = useMemo(() => {
    return appointments.filter((a) => a.appointment_date === today);
  }, [appointments, today]);

  const { upcoming, waiting, inProgress, completed, noShow } = useMemo(() => ({
    upcoming: todayAppts.filter((a) => a.status === "scheduled" || a.status === "confirmed"),
    waiting: todayAppts.filter((a) => a.status === "arrived"),
    inProgress: todayAppts.filter((a) => a.status === "in_progress"),
    completed: todayAppts.filter((a) => a.status === "completed"),
    noShow: todayAppts.filter((a) => a.status === "cancelled" || a.status === "no_show"),
  }), [todayAppts]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    if (!clinicId || !user) return;
    try {
      await service.changeStatus(clinicId, appointmentId, newStatus, user.id);
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Today" description={todayLabel}>
        <div className="flex items-center gap-2">
          <RealtimeStatusBadge status={status}/>
          <Link to="/appointments/calendar" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <Calendar className="size-3.5"/>
            Calendar
          </Link>
          <Link to="/appointments/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5"/>
            New
          </Link>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent"/>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KanbanColumn title="Upcoming" count={upcoming.length} color="bg-blue-50 border-blue-200" textColor="text-blue-700">
            {upcoming.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onStatusChange={handleStatusChange} nextStatus="arrived" nextLabel="Mark arrived"/>
            ))}
          </KanbanColumn>

          <KanbanColumn title="Waiting" count={waiting.length} color="bg-amber-50 border-amber-200" textColor="text-amber-700">
            {waiting.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onStatusChange={handleStatusChange} nextStatus="in_progress" nextLabel="Start"/>
            ))}
          </KanbanColumn>

          <KanbanColumn title="In Progress" count={inProgress.length} color="bg-purple-50 border-purple-200" textColor="text-purple-700">
            {inProgress.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onStatusChange={handleStatusChange} nextStatus="completed" nextLabel="Complete"/>
            ))}
          </KanbanColumn>

          <KanbanColumn title="Completed" count={completed.length} color="bg-emerald-50 border-emerald-200" textColor="text-emerald-700">
            {completed.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onStatusChange={null} nextLabel=""/>
            ))}
          </KanbanColumn>

          <KanbanColumn title="No Show" count={noShow.length} color="bg-red-50 border-red-200" textColor="text-red-700">
            {noShow.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onStatusChange={null} nextLabel=""/>
            ))}
          </KanbanColumn>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ title, count, color, textColor, children }) {
  return (
    <div className={`rounded-xl border ${color} ${textColor}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit/50">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs font-medium opacity-70">{count}</span>
      </div>
      <div className="space-y-2 p-3 min-h-[120px]">
        {children.length === 0 ? <p className="text-xs text-center py-6 opacity-50">Empty</p> : children}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment: apt, onStatusChange, nextStatus, nextLabel }) {
  return (
    <div className="bg-white rounded-lg border p-3 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0a2540]">{apt.patient_name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="size-3"/>
            {apt.start_time?.substring(0, 5)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <AppointmentStatusBadge status={apt.status}/>
          {apt.source && apt.source !== "receptionist" && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{apt.source}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{apt.doctor?.full_name}</p>
      <div className="flex items-center gap-1.5 mt-2.5">
        {apt.patient_phone && (
          <a href={`tel:${apt.patient_phone}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <Phone className="size-3"/>
            Call
          </a>
        )}
        {apt.patient_id && apt.status !== "completed" && (
          <Link to={`/consultations/new?appointmentId=${apt.id}&patientId=${apt.patient_id}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-purple-700 border-purple-200 hover:bg-purple-50 transition-colors">
            <Stethoscope className="size-3"/>
            Consult
          </Link>
        )}
        {onStatusChange && (
          <button onClick={() => onStatusChange(apt.id, nextStatus)} className="inline-flex items-center gap-1 rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white hover:bg-primary transition-colors">
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
