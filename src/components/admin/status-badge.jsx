import { cn } from "@/utils/cn";

const variants = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  passed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",

  suspended: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  disconnected: "bg-red-50 text-red-700 border-red-200",
  error: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-red-50 text-red-700 border-red-200",

  trial: "bg-amber-50 text-amber-700 border-amber-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  degraded: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",

  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  disabled: "bg-slate-50 text-slate-500 border-slate-200",
  not_set_up: "bg-slate-50 text-slate-500 border-slate-200",
};

const dotColors = {
  active: "bg-emerald-500",
  connected: "bg-emerald-500",
  paid: "bg-emerald-500",
  healthy: "bg-emerald-500",
  passed: "bg-emerald-500",
  sent: "bg-emerald-500",
  delivered: "bg-emerald-500",
  ok: "bg-emerald-500",
  success: "bg-emerald-500",
  suspended: "bg-red-500",
  expired: "bg-red-500",
  failed: "bg-red-500",
  overdue: "bg-red-500",
  disconnected: "bg-red-500",
  error: "bg-red-500",
  critical: "bg-red-500",
  trial: "bg-amber-500",
  warning: "bg-amber-500",
  degraded: "bg-amber-500",
  pending: "bg-amber-500",
  inactive: "bg-slate-300",
  disabled: "bg-slate-300",
  not_set_up: "bg-slate-300",
};

export function StatusBadge({ status, label, dot = true }) {
  const normalized = (status || "").toLowerCase().replace(/\s+/g, "_");
  const variant = variants[normalized] || "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", variant)}>
      {dot && <span className={cn("size-1.5 rounded-full", dotColors[normalized] || "bg-slate-300")} />}
      {label || status}
    </span>
  );
}
