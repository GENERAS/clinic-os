"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Calendar, Clock } from "lucide-react";
import { getPatientService } from "../services/patient.service";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
export function PatientAppointmentsList({ clinicId, patientId }) {
    const [appointments, setAppointments] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const service = useMemo(() => getPatientService(), []);
    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const result = await service.getPatientAppointments(clinicId, patientId, page, pageSize);
            setAppointments(result.data);
            setTotal(result.total);
        }
        catch {
            // ignore
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, patientId, page, pageSize, service]);
    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);
    const totalPages = Math.ceil(total / pageSize);
    if (loading && appointments.length === 0) {
        return (<div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (appointments.length === 0) {
        return (<p className="py-8 text-center text-sm text-muted-foreground">No appointment history</p>);
    }
    return (<div className="space-y-3">
      {appointments.map((apt) => {
            const doctor = apt.doctor;
            return (<Link key={apt.id} to={`/appointments/${apt.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(apt.patient_name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground"/>
                <span className="text-sm font-medium">
                  {new Date(apt.appointment_date + "T00:00:00").toLocaleDateString()}
                </span>
                <Clock className="size-3.5 text-muted-foreground"/>
                <span className="text-xs text-muted-foreground">
                  {apt.start_time?.substring(0, 5)} — {apt.end_time?.substring(0, 5)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {doctor?.full_name || "Unknown doctor"}
                {apt.reason ? ` — ${apt.reason}` : ""}
              </p>
            </div>
            <AppointmentStatusBadge status={apt.status || "scheduled"}/>
          </Link>);
        })}

      {totalPages > 1 && (<div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
            Next
          </button>
        </div>)}
    </div>);
}
