"use client"

import Link from "next/link"
import { AlertTriangle, Users, Calendar, Settings } from "lucide-react"
import type { DashboardTask } from "../types"

interface TaskCardProps {
  tasks: DashboardTask[]
}

const taskIcons: Record<DashboardTask["type"], typeof AlertTriangle> = {
  low_stock: AlertTriangle,
  pending_invitations: Users,
  upcoming_appointments: Calendar,
  incomplete_setup: Settings,
}

const taskColors: Record<DashboardTask["type"], string> = {
  low_stock: "text-amber-500",
  pending_invitations: "text-blue-500",
  upcoming_appointments: "text-emerald-500",
  incomplete_setup: "text-slate-500",
}

export function TaskCard({ tasks }: TaskCardProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Calendar className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All clear</p>
        <p className="text-xs text-muted-foreground">No tasks need your attention</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const Icon = taskIcons[task.type]
        const color = taskColors[task.type]
        return (
          <Link
            key={task.id}
            href={task.link}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
          >
            <div className={`flex size-9 items-center justify-center rounded-lg bg-muted ${color}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{task.label}</p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
              {task.count}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
