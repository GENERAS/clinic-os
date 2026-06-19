"use client";
import { useEffect, useState } from "react";
import { Sparkles, CalendarCheck, CheckCircle } from "lucide-react";

export function WinMomentCelebration({ onContinue }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);

  if (!show) return <div className="flex justify-center py-10"><div className="size-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" /></div>;

  return (
    <div className="flex flex-col items-center text-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative mb-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CalendarCheck className="size-8 text-emerald-600" />
        </div>
        <Sparkles className="absolute -right-1 -top-1 size-5 text-yellow-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Automation is ready</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">
        Your patient will automatically receive a reminder 24 hours before their appointment.
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><CheckCircle className="size-3.5 text-emerald-500" /> Patient notified</span>
        <span className="flex items-center gap-1"><CheckCircle className="size-3.5 text-emerald-500" /> Reminder queued</span>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
