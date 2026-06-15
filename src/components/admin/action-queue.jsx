import { cn } from "@/utils/cn";
import { AlertTriangle, XCircle, Clock, Info, ChevronRight } from "lucide-react";

const severityColors = {
  critical: {
    border: "border-l-red-500",
    bg: "bg-red-50/30",
    icon: XCircle,
    iconColor: "text-red-600",
  },
  high: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/30",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  medium: {
    border: "border-l-blue-500",
    bg: "bg-blue-50/30",
    icon: Clock,
    iconColor: "text-blue-600",
  },
  low: {
    border: "border-l-slate-300",
    bg: "bg-white",
    icon: Info,
    iconColor: "text-slate-500",
  },
};

export function ActionQueue({ title = "Action Queue", items = [], emptyMessage = "No items need action" }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => {
            const sev = severityColors[item.severity] || severityColors.low;
            const Icon = sev.icon;
            return (
              <div key={i} className={cn("flex items-center justify-between border-l-4 px-5 py-3", sev.border, sev.bg)}>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn("size-4 shrink-0", sev.iconColor)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.clinic}</p>
                    <p className="text-xs text-slate-500 truncate">{item.problem}</p>
                    {item.time && <p className="text-xs text-slate-500">{item.time}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  {item.actions?.map((action, j) => (
                    <button
                      key={j}
                      onClick={action.onClick}
                      className="rounded border bg-white px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                  {item.link && (
                    <button
                      onClick={item.link.onClick}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
