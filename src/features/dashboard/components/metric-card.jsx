"use client";
export function MetricCard({ label, value, icon, trend, trendUp, onClick }) {
    return (<button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      {icon && (<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
          {icon}
        </div>)}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      </div>
    </button>);
}
