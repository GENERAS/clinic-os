import { cn } from "@/utils/cn";
import { Clock } from "lucide-react";

function ActivityDot({ type }) {
  const dotMap = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-gray-300",
  };
  return <span className={cn("size-2 rounded-full shrink-0 mt-0.5", dotMap[type] || dotMap.neutral)} />;
}

export function ActivityFeed({ title = "Activity", items = [], emptyMessage = "No recent activity" }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <ActivityDot type={item.type} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{item.entity}</span>
                  {item.action && (
                    <span className="text-xs text-slate-500"> {item.action}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">{item.detail}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                <Clock className="size-3" />
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
