"use client";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, User, Stethoscope } from "lucide-react";
import { handleApiError } from "@/lib/errors";

export function VisitHistoryList({ clinicId, patientId, service }) {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!clinicId || !patientId || !service) return;
        setLoading(true);
        service.getPatientVisits(clinicId, patientId)
            .then(setVisits)
            .catch((err) => setError(handleApiError(err, "Failed to load visit history")))
            .finally(() => setLoading(false));
    }, [clinicId, patientId, service]);

    if (loading) {
        return <div className="flex justify-center py-8"><div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent"/></div>;
    }

    if (error) {
        return <p className="text-xs text-red-500 py-4">Failed to load visit history.</p>;
    }

    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Stethoscope className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No consultation history for this patient.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {visits.map((v) => {
                const vDate = new Date(v.created_at);
                const primaryDiag = (v.diagnoses || []).filter(d => d.type === "primary").map(d => d.description);
                const medicines = (v.prescriptions || []).map(p => p.medicine_name);
                return (
                    <Link
                        key={v.id}
                        to={`/consultations/${v.id}`}
                        className="block rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="size-3" />
                                {vDate.toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                                <Clock className="size-3 ml-1" />
                                {vDate.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                v.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                v.status === "in_progress" ? "bg-amber-50 text-amber-700" :
                                "bg-red-50 text-red-700"
                            }`}>
                                {v.status}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{v.chief_complaint || "No complaint recorded"}</p>
                        {primaryDiag.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-medium">Dx:</span> {primaryDiag.join(", ")}
                            </p>
                        )}
                        {medicines.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-medium">Rx:</span> {medicines.slice(0, 3).join(", ")}{medicines.length > 3 ? ` +${medicines.length - 3} more` : ""}
                            </p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                            <User className="size-2.5" />
                            {v.users?.full_name || "Unknown doctor"}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
