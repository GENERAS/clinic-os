import { MESSAGE_STATUS_LABELS } from "../types";
const statusStyles = {
    queued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    read: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};
export function WhatsAppStatusBadge({ status }) {
    return (<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {MESSAGE_STATUS_LABELS[status]}
    </span>);
}
