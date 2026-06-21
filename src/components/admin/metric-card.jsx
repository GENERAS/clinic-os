import { cn } from "@/utils/cn";
import { ArrowRight } from "lucide-react";

const variants = {
  failed: {
    container: "border-l-4 border-l-red-500",
    icon: "text-red-600",
    value: "text-red-700",
  },
  warning: {
    container: "border-l-4 border-l-amber-500",
    icon: "text-amber-600",
    value: "text-amber-700",
  },
  pending: {
    container: "border-l-4 border-l-blue-500",
    icon: "text-blue-600",
    value: "text-blue-700",
  },
  healthy: {
    container: "",
    icon: "text-slate-400",
    value: "text-slate-900",
  },
};

export function MetricCard({ icon: Icon, label, value, trend, action, variant = "healthy" }) {
  const v = variants[variant] || variants.healthy;
  return (
    <div className={cn(
      "rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm",
      v.container
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={cn("size-4 shrink-0", v.icon)} />
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        </div>
        {trend != null && (
          <span className={cn(
            "text-xs font-semibold shrink-0",
            trend >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <p className={cn("text-lg sm:text-xl font-bold tracking-tight truncate", v.value)}>{value ?? "—"}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-0.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
          >
            {action.label} <ArrowRight className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
