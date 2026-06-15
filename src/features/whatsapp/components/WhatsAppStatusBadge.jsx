import { MESSAGE_STATUS_LABELS } from "../types";
const statusStyles = {
    queued: "bg-amber-50 text-amber-700",
    sent: "bg-blue-50 text-blue-700",
    delivered: "bg-emerald-50 text-emerald-700",
    read: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
};
export function WhatsAppStatusBadge({ status }) {
    return (<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {MESSAGE_STATUS_LABELS[status]}
    </span>);
}
