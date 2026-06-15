"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { APPOINTMENT_STATUS_TRANSITIONS, APPOINTMENT_STATUS_LABELS } from "../types";
const actionLabel = {
    confirm: "Confirm",
    arrived: "Arrived",
    in_progress: "Start",
    completed: "Complete",
    cancelled: "Cancel",
    no_show: "No Show",
};
export function QuickActions({ appointmentId, currentStatus, onAction }) {
    const [loading, setLoading] = useState(null);
    const allowed = APPOINTMENT_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || allowed.length === 0)
        return null;
    const handleAction = async (newStatus) => {
        setLoading(newStatus);
        try {
            await onAction(appointmentId, newStatus);
        }
        catch {
            // error handled by parent
        }
        finally {
            setLoading(null);
        }
    };
    return (<div className="flex items-center gap-1">
      {allowed.map((status) => (<button key={status} onClick={() => handleAction(status)} disabled={loading !== null} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${status === "cancelled" || status === "no_show"
                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                : status === "completed"
                    ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                    : "text-primary hover:bg-primary/10"}`} title={APPOINTMENT_STATUS_LABELS[status]}>
          {loading === status && <Loader2 className="size-3 animate-spin"/>}
          {actionLabel[status] || APPOINTMENT_STATUS_LABELS[status]}
        </button>))}
    </div>);
}
