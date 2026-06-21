"use client";
export function MetricCard({ label, value, icon, trend, trendUp, onClick }) {
    return (<button type="button" onClick={onClick} className="flex w-full items-center gap-2 sm:gap-3 rounded-xl border bg-card p-2.5 sm:p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/20 min-h-[56px]">
      {icon && (<div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
          {icon}
        </div>)}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className="mt-0.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight truncate">{value}</p>
      </div>
    </button>);
}
