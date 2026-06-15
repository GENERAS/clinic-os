"use client";

export function UsageBars({ usage, plan }) {
  if (!usage || !plan) {
    return <p className="py-4 text-center text-xs text-slate-500">No usage data available.</p>;
  }

  const limits = [
    { label: "Staff", current: usage.staff, max: plan.max_staff },
    { label: "Patients", current: usage.patients, max: plan.max_patients === 99999 ? Infinity : plan.max_patients },
  ];

  return (
    <div className="space-y-4">
      {limits.map((item) => {
        const pct = item.max === Infinity ? 0 : Math.min(100, Math.round((item.current / item.max) * 100));
        const isOver = item.max !== Infinity && item.current >= item.max;
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
              <span className="text-xs text-slate-500">
                {item.current.toLocaleString()} / {item.max === Infinity ? "Unlimited" : item.max.toLocaleString()}
              </span>
            </div>
            {item.max !== Infinity && (
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-teal-500"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
