"use client";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, Phone, Clock, Stethoscope } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";
import { PageHeader } from "@/components/shared/page-header";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const COLUMNS = [
  { id: "upcoming", title: "Upcoming", statuses: ["scheduled", "confirmed"], dropStatus: "arrived", color: "bg-blue-50 border-blue-200", textColor: "text-blue-700" },
  { id: "waiting", title: "Waiting", statuses: ["arrived"], dropStatus: "in_progress", color: "bg-amber-50 border-amber-200", textColor: "text-amber-700" },
  { id: "inProgress", title: "In Progress", statuses: ["in_progress"], dropStatus: "completed", color: "bg-purple-50 border-purple-200", textColor: "text-purple-700" },
  { id: "completed", title: "Completed", statuses: ["completed"], dropStatus: null, color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700" },
  { id: "noShow", title: "No Show", statuses: ["cancelled", "no_show"], dropStatus: null, color: "bg-red-50 border-red-200", textColor: "text-red-700" },
];

export default function TodayAppointmentsPage() {
  const { user, clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const service = getAppointmentService();

  const { appointments, loading, status } = useRealtimeAppointments(clinicId);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const today = new Date().toISOString().split("T")[0];
  const columnAppts = useMemo(() => {
    const todayApts = appointments.filter((a) => a.appointment_date === today);
    const grouped = {};
    for (const col of COLUMNS) {
      grouped[col.id] = todayApts.filter((a) => col.statuses.includes(a.status));
    }
    return grouped;
  }, [appointments, today]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    if (!clinicId || !user) return;
    try {
      await service.changeStatus(clinicId, appointmentId, newStatus, user.id);
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update status"));
    }
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const appointmentId = active.id;
    const targetColumn = COLUMNS.find((c) => c.id === over.id);
    if (!targetColumn || !targetColumn.dropStatus) return;
    const sourceColumn = COLUMNS.find((c) => c.statuses.includes(active.data.current.status));
    if (!sourceColumn || sourceColumn.id === targetColumn.id) return;
    handleStatusChange(appointmentId, targetColumn.dropStatus);
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
        <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((col) => (
              <DroppableColumn key={col.id} id={col.id} title={col.title} count={columnAppts[col.id].length} color={col.color} textColor={col.textColor} isOver={activeId && col.dropStatus !== null}>
                {columnAppts[col.id].map((apt) => (
                  <DraggableCard key={apt.id} id={apt.id} appointment={apt} onStatusChange={handleStatusChange} nextStatus={col.dropStatus} nextLabel={DROPPABLE_LABELS[col.id] || ""} isActive={activeId === apt.id}/>
                ))}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}

const DROPPABLE_LABELS = { upcoming: "Mark arrived", waiting: "Start", inProgress: "Complete" };

function DroppableColumn({ id, title, count, color, textColor, children, isOver }) {
  const { setNodeRef, isOver: over } = useDroppable({ id, disabled: !isOver });
  return (
    <div ref={setNodeRef} className={`rounded-xl border transition-shadow ${color} ${textColor} ${over ? "shadow-lg ring-2 ring-primary/50" : ""}`}>
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

function DraggableCard({ id, appointment: apt, onStatusChange, nextStatus, nextLabel, isActive }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { status: apt.status },
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`bg-white rounded-lg border p-3 shadow-sm transition-shadow ${isDragging ? "shadow-xl opacity-80 rotate-2" : "hover:shadow"} ${isActive ? "ring-2 ring-primary" : ""}`}>
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
          <a href={`tel:${apt.patient_phone}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors" onClick={(e) => e.stopPropagation()}>
            <Phone className="size-3"/>
            Call
          </a>
        )}
        {apt.patient_id && apt.status !== "completed" && (
          <Link to={`/consultations/new?appointmentId=${apt.id}&patientId=${apt.patient_id}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-purple-700 border-purple-200 hover:bg-purple-50 transition-colors" onClick={(e) => e.stopPropagation()}>
            <Stethoscope className="size-3"/>
            Consult
          </Link>
        )}
        {onStatusChange && nextLabel && (
          <button onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, nextStatus); }} className="inline-flex items-center gap-1 rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white hover:bg-primary transition-colors">
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
