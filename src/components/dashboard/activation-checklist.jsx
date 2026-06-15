"use client";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Building2, Users, CalendarDays, Bell, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { key: "profile", label: "Complete clinic profile", icon: Building2, href: "/settings/clinic" },
  { key: "staff", label: "Add first staff member", icon: Users, href: "/settings/staff" },
  { key: "patient", label: "Add first patient", icon: Users, href: "/patients/new" },
  { key: "appointment", label: "Create first appointment", icon: CalendarDays, href: "/appointments/new" },
  { key: "whatsapp", label: "Connect WhatsApp", icon: Smartphone, href: "/settings/whatsapp" },
  { key: "reminder", label: "Send first reminder", icon: Bell, href: "/whatsapp" },
];

export function ActivationChecklist({ clinicId }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const checkProgress = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    const supabase = createClient();
    const done = [];

    try {
      const { data: clinic } = await supabase.from("clinics").select("name, phone, email").eq("id", clinicId).single();
      if (clinic?.name && clinic?.phone) done.push("profile");
    } catch {}

    try {
      const { count: staffCount } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      if (staffCount > 1) done.push("staff");
    } catch {}

    try {
      const { count: patientCount } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      if (patientCount > 0) done.push("patient");
    } catch {}

    try {
      const { count: apptCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      if (apptCount > 0) done.push("appointment");
    } catch {}

    try {
      const { count: waCount } = await supabase.from("whatsapp_credentials").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      if (waCount > 0) done.push("whatsapp");
    } catch {}

    try {
      const { count: msgCount } = await supabase.from("message_logs").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      if (msgCount > 0) done.push("reminder");
    } catch {}

    setCompleted(done);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { checkProgress(); }, [checkProgress]);

  if (loading) return null;

  const total = ITEMS.length;
  const doneCount = completed.length;
  const allDone = doneCount === total;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Getting Started</h3>
        <span className="text-xs font-medium text-slate-500">{doneCount}/{total} done</span>
      </div>
      <div className="mb-3 h-1.5 rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
      <div className="space-y-1">
        {ITEMS.map((item) => {
          const isDone = completed.includes(item.key);
          return (
            <button
              key={item.key}
              onClick={() => !isDone && navigate(item.href)}
              disabled={isDone}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                isDone ? "opacity-50" : "hover:bg-slate-50 cursor-pointer"
              }`}
            >
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                isDone ? "bg-teal-50 border-teal-200 text-teal-600" : "border-slate-300 text-transparent"
              }`}>
                {isDone ? <Check className="size-3" /> : null}
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <item.icon className={`size-3.5 shrink-0 ${isDone ? "text-teal-500" : "text-slate-400"}`} />
                <span className={`text-xs ${isDone ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
              </div>
              {!isDone && <ChevronRight className="size-3 text-slate-300 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
