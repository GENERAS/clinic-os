import { cn } from "@/utils/cn"

interface RoleBadgeProps {
  role: string
  className?: string
}

const roleStyles: Record<string, string> = {
  Owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Doctor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Receptionist: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Pharmacist: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        roleStyles[role] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
        className
      )}
    >
      {role}
    </span>
  )
}
