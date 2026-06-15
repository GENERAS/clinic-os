import { cn } from "@/utils/cn";
import { AlertTriangle, XCircle, Clock, AlertCircle } from "lucide-react";

const severityConfig = {
  critical: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    icon: XCircle,
    iconColor: "text-red-500",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    dot: "bg-amber-500",
  },
  medium: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    icon: Clock,
    iconColor: "text-blue-500",
    dot: "bg-blue-500",
  },
  low: {
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-600",
    icon: AlertCircle,
    iconColor: "text-slate-400",
    dot: "bg-slate-300",
  },
};

export function AlertStrip({ alerts = [] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const sev = severityConfig[alert.severity] || severityConfig.medium;
        const Icon = sev.icon;
        return (
          <div key={i} className={cn("flex items-center justify-between rounded-lg border px-4 py-3", sev.bg)}>
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={cn("size-5 shrink-0", sev.iconColor)} />
              <div className="min-w-0">
                <p className={cn("text-sm font-medium truncate", sev.text)}>
                  <span className="font-semibold">{alert.count}</span> {alert.label}
                </p>
                {alert.description && (
                  <p className="text-xs text-slate-500 truncate">{alert.description}</p>
                )}
              </div>
            </div>
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {alert.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
