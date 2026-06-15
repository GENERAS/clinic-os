import { cn } from "@/utils/cn";
import { APPOINTMENT_STATUS_LABELS } from "../types";
const dotColors = {
    scheduled: "bg-blue-400",
    confirmed: "bg-indigo-400",
    arrived: "bg-cyan-400",
    in_progress: "bg-amber-400",
    completed: "bg-emerald-400",
    cancelled: "bg-red-400",
    no_show: "bg-gray-400",
};
const bgStyles = {
    scheduled: "bg-blue-50 text-blue-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    arrived: "bg-cyan-50 text-cyan-700",
    in_progress: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-gray-50 text-gray-600",
};
export function AppointmentStatusBadge({ status, className }) {
    return (<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", bgStyles[status], className)}>
      <span className={cn("size-1.5 rounded-full", dotColors[status])} />
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>);
}
