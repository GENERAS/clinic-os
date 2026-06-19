"use client";
import { AlertTriangle, TrendingDown } from "lucide-react";

export function MissedRevenueCalculator({ monthlyLoss, yearlyLoss, missedPerMonth }) {
  const fmt = (n) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="size-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-900">You are leaving money on the table</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-slate-500">Missed / month</p>
          <p className="text-lg font-bold text-slate-900">{missedPerMonth}</p>
          <p className="text-[10px] text-slate-400">appointments</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center shadow-sm ring-1 ring-amber-200">
          <p className="text-xs text-amber-600 font-medium">Lost monthly</p>
          <p className="text-lg font-bold text-amber-700">{fmt(monthlyLoss)}</p>
          <p className="text-[10px] text-amber-500">RWF</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center shadow-sm ring-1 ring-red-200">
          <p className="text-xs text-red-600 font-medium">Lost yearly</p>
          <p className="text-lg font-bold text-red-700">{fmt(yearlyLoss)}</p>
          <p className="text-[10px] text-red-500">RWF</p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/60 p-3">
        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-slate-600">
          ClinicOS automated reminders can recover up to 80% of missed appointments.
          That's <strong className="text-amber-800">{fmt(Math.round(monthlyLoss * 0.8))}/month</strong> back to your clinic.
        </p>
      </div>
    </div>
  );
}
