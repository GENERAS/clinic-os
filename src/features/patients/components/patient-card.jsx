"use client";
import { Link } from "react-router-dom";
import { Phone, Calendar } from "lucide-react";
export function PatientCard({ patient }) {
    return (<div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link to={`/patients/${patient.id}`} className="font-medium hover:underline">
              {patient.full_name}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3"/>
              {patient.phone}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {patient.gender && <span className="capitalize">{patient.gender}</span>}
        <span>{patient.total_visits} visit{patient.total_visits !== 1 ? "s" : ""}</span>
        {patient.last_visit_date && (<span>Last: {new Date(patient.last_visit_date + "T00:00:00").toLocaleDateString()}</span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <Link to={`/patients/${patient.id}`} className="flex-1 rounded-lg border px-3 py-1.5 text-center text-xs font-medium hover:bg-muted">
          View
        </Link>
        <Link to={`/appointments/new?patient_id=${patient.id}`} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <span className="inline-flex items-center justify-center gap-1">
            <Calendar className="size-3"/>
            Book
          </span>
        </Link>
      </div>
    </div>);
}
