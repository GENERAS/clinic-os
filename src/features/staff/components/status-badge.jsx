import { cn } from "@/utils/cn";
const statusStyles = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    inactive: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
export function StatusBadge({ status, className }) {
    return (<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[status] || "bg-gray-100 text-gray-700", className)}>
      {status}
    </span>);
}
