"use client";
import { Link } from "react-router-dom";
import { Calendar, Clock, User } from "lucide-react";
import { AppointmentStatusBadge } from "./appointment-status-badge";
export function AppointmentCard({ appointment: apt }) {
    return (<Link to={`/appointments/${apt.id}`} className="block rounded-xl border p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{apt.patient_name}</p>
          {apt.patient_phone && (<p className="truncate text-xs text-muted-foreground">{apt.patient_phone}</p>)}
        </div>
        <AppointmentStatusBadge status={apt.status}/>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="size-3.5 shrink-0"/>
          <span className="truncate">{apt.doctor.full_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 shrink-0"/>
          <span>{new Date(apt.appointment_date + "T00:00:00").toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0"/>
          <span>
            {apt.start_time.substring(0, 5)} - {apt.end_time.substring(0, 5)}
          </span>
        </div>
      </div>
      {apt.reason && (<p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{apt.reason}</p>)}
    </Link>);
}
