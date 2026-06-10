"use client"

import type { ReactNode } from "react"

interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: string
  trendUp?: boolean
  onClick?: () => void
}

export function MetricCard({ label, value, icon, trend, trendUp, onClick }: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/30"
    >
      {icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
        {trend && (
          <p className={`mt-0.5 text-xs ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
            {trend}
          </p>
        )}
      </div>
    </button>
  )
}
