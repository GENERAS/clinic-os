import { cn } from "@/utils/cn"
import type { AppointmentStatus } from "../types"
import { APPOINTMENT_STATUS_LABELS } from "../types"

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
  className?: string
}

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  arrived: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  )
}
