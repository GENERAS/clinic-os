"use client";
import { TrendingUp, Zap, ArrowRight, Clock, MessageCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ConversionTrigger({ monthlyLoss }) {
  const navigate = useNavigate();
  const fmt = (n) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  const savings = [
    { icon: Clock, label: "Staff time saved", value: "~12 hrs/month" },
    { icon: MessageCircle, label: "Auto-reminders sent", value: "No manual calls" },
    { icon: Users, label: "Missed appts recovered", value: `~${fmt(Math.round(monthlyLoss * 0.8))}/mo` },
  ];

  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="size-5 text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-900">You are saving ~12 hours/month of manual calls</h3>
      </div>

      <div className="space-y-2">
        {savings.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <s.icon className="size-3.5 text-teal-600" />
              <span className="text-xs text-slate-600">{s.label}</span>
            </div>
            <span className="text-xs font-semibold text-teal-700">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-teal-600 p-0.5">
        <button
          onClick={() => navigate("/subscription")}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
        >
          <Zap className="size-4" />
          Unlock full automation with WhatsApp connection
          <ArrowRight className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-400">Upgrade to activate automation and save more</p>
    </div>
  );
}
