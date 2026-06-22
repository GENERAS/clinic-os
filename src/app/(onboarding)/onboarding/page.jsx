"use client";
import { useState, useCallback, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Building2, Clock, ArrowRight, ArrowLeft, Check, Loader2,
  Users, CalendarDays, Bell, Smartphone, Trophy, Target, Plus,
  Sparkles, MessageCircle, Send, X
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getOnboardingService } from "@/features/onboarding/services/onboarding.service";
import { getDemoService } from "@/features/demo/demo.service";
import { MissedRevenueCalculator } from "@/features/onboarding/components/missed-revenue-calculator";
import { WhatsAppValuePreview } from "@/features/onboarding/components/whatsapp-value-preview";
import { WinMomentCelebration } from "@/features/onboarding/components/win-moment-celebration";
import { ConversionTrigger } from "@/features/onboarding/components/conversion-trigger";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const revenue = getDemoService().getEstimatedLostRevenue();

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, clinic, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clinicId, setClinicId] = useState(null);

  if (!isAuthenticated) return <Navigate to="/signup" replace />;
  if (clinic?.onboarding_completed && step === 0) return <Navigate to="/dashboard" replace />;

  const handleClinicCreated = (id) => {
    setClinicId(id);
    refresh();
    setStep(3);
  };

  const handleComplete = async () => {
    const supabase = createClient();
    if (clinic?.id) {
      await supabase.from("clinics").update({ onboarding_completed: true }).eq("id", clinic.id);
    } else if (clinicId) {
      await supabase.from("clinics").update({ onboarding_completed: true }).eq("id", clinicId);
    }
    await refresh();
    setTimeout(() => navigate("/dashboard"), 400);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Steps tracker — simple dots */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-6 bg-teal-600" : i < step ? "w-2 bg-teal-400" : "w-2 bg-slate-200"}`} />
          ))}
        </div>

        {step === 0 && <ValuePreviewStep onNext={() => setStep(1)} />}
        {step === 1 && <ClinicSnapshotStep onNext={({ id }) => handleClinicCreated(id)} loading={loading} setLoading={setLoading} />}
        {step === 2 && <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-teal-600" /></div>}
        {step === 3 && <MissionOnePatient clinicId={clinicId} onNext={() => setStep(4)} />}
        {step === 4 && <WhatsAppPreviewStep onNext={() => setStep(5)} />}
        {step === 5 && <MissionTwoAppointment clinicId={clinicId} onNext={() => setStep(6)} />}
        {step === 6 && <WinMomentStep onNext={() => setStep(7)} />}
        {step === 7 && <CompletionStep onDashboard={handleComplete} monthlyLoss={revenue.monthlyLoss} />}
      </div>
    </div>
  );
}

/* STEP 0 — Instant Value Preview */
function ValuePreviewStep({ onNext }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 400); return () => clearTimeout(t); }, []);

  return (
    <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-teal-50">
          <BarChart3Icon />
        </div>
        <h1 className="text-xl font-bold text-slate-900">This is how your clinic will look in 2 minutes</h1>
        <p className="mt-1 text-sm text-slate-500">We'll show you the value first — then set up.</p>
      </div>

      <MissedRevenueCalculator
        monthlyLoss={revenue.monthlyLoss}
        yearlyLoss={revenue.yearlyLoss}
        missedPerMonth={revenue.missedPerMonth}
      />

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">With ClinicOS you get</h3>
        <div className="space-y-2">
          {[
            { icon: CalendarDays, label: "Smart scheduling dashboard" },
            { icon: Bell, label: "Automatic WhatsApp reminders" },
            { icon: Users, label: "Patient records at your fingertips" },
            { icon: Clock, label: "Reduce no-shows by up to 80%" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 text-sm text-slate-600">
              <Check className="size-4 text-teal-500 shrink-0" />
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
      >
        Set up your clinic <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

function BarChart3Icon() { return <svg className="size-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }

/* STEP 1 — Clinic Snapshot (minimal) */
function ClinicSnapshotStep({ onNext, loading, setLoading }) {
  const { user, clinic } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", role: "Owner" });
  const supabase = createClient();

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const canContinue = form.name && form.phone;

  const handleSubmit = async () => {
    if (!canContinue || !user) return;
    setLoading(true);
    try {
      let clinicId;

      if (clinic?.id) {
        clinicId = clinic.id;
        await supabase.from("clinics").update({ name: form.name, phone: form.phone }).eq("id", clinicId);
      } else {
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clinic";
        const { data: clinicData, error: clinicError } = await supabase.rpc("create_clinic_onboarding", {
          p_name: form.name,
          p_slug: slug + "-" + Date.now(),
          p_phone: form.phone,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Kigali",
        });
        if (clinicError || !clinicData) throw new Error(clinicError?.message || "Failed to create clinic");
        clinicId = clinicData;
      }

      onNext({ id: clinicId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create clinic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transition-all duration-700">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Building2 className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Name your clinic</h1>
        <p className="mt-1 text-sm text-slate-500">Just the basics. You can customize later.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="text-xs font-medium text-slate-500">Clinic Name</label>
          <input value={form.name} onChange={(e) => update({ name: e.target.value })}
            placeholder="HeartCare Clinic"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Phone Number</label>
          <input value={form.phone} onChange={(e) => update({ phone: e.target.value })}
            placeholder="+250 7XX XXX XXX"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Your Role</label>
          <select value={form.role} onChange={(e) => update({ role: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors">
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Doctor">Doctor</option>
            <option value="Receptionist">Receptionist</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!canContinue || loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

/* Mission Card */
function MissionCard({ icon: Icon, title, desc, reward, onAction, actionLabel, skipLabel, onSkip, children }) {
  return (
    <div className="transition-all duration-700">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-teal-50">
          <Icon className="size-6 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-amber-50 px-3 py-2">
          <Trophy className="size-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-800">Reward: {reward}</span>
        </div>
        {children}
      </div>
      <button
        onClick={onAction}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
      >
        {actionLabel || "Continue"} <ArrowRight className="size-4" />
      </button>
      {skipLabel && (
        <button onClick={onSkip} className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
          {skipLabel}
        </button>
      )}
    </div>
  );
}

/* STEP 3 — Mission 1: Add First Patient */
function MissionOnePatient({ clinicId, onNext }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", age: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleAdd = async () => {
    if (!form.name || !clinicId) return;
    setSaving(true);
    try {
      const patientPhone = form.phone || "Unknown";
      const dob = form.age ? `${new Date().getFullYear() - Number(form.age)}-01-01` : null;
      const { error } = await supabase.rpc("create_patient", {
        p_clinic_id: clinicId, p_full_name: form.name, p_phone: patientPhone,
        p_created_by: user?.id, p_date_of_birth: dob,
      });
      if (error) throw error;
      toast.success("Patient added successfully");
      onNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MissionCard
      icon={Users} title="Add your first patient" desc="Create a patient record to start booking appointments."
      reward="Unlock appointment system"
      actionLabel={saving ? "Saving..." : "Add Patient"}
      skipLabel="Skip for now"
      onAction={handleAdd}
      onSkip={onNext}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Patient Name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="John Mugisha"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Phone</label>
          <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+250 7XX XXX XXX"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Age (optional)</label>
          <input type="number" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
            placeholder="35"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
      </div>
    </MissionCard>
  );
}

/* STEP 4 — WhatsApp Value Preview */
function WhatsAppPreviewStep({ onNext }) {
  const previews = getDemoService().getDemoMessagePreviews();
  const [choice, setChoice] = useState(null);

  if (choice === "yes") {
    return (
      <div className="transition-all duration-700">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-teal-50">
            <Smartphone className="size-6 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp is ready</h1>
          <p className="mt-1 text-sm text-slate-500">We will help you connect WhatsApp later in 2 minutes from Settings.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <Check className="mx-auto size-8 text-teal-500 mb-2" />
          <p className="text-sm text-slate-600">Automatic reminders will work once connected.</p>
        </div>
        <button onClick={onNext} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors">
          Continue <ArrowRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="transition-all duration-700">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Bell className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Reminders</h1>
        <p className="mt-1 text-sm text-slate-500">Do you want patients to receive automatic reminders?</p>
      </div>
      <WhatsAppValuePreview previews={previews} />
      <div className="mt-4 flex gap-3">
        <button onClick={() => { setChoice("yes"); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors">
          <Check className="size-4" /> Yes (Recommended)
        </button>
        <button onClick={onNext} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Clock className="size-4" /> Later
        </button>
      </div>
    </div>
  );
}

/* STEP 5 — Mission 2: Create First Appointment */
function MissionTwoAppointment({ clinicId, onNext }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patientId: "", patientName: "", date: "", time: "09:00", reason: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!clinicId) return;
    supabase.from("patients").select("id, full_name, phone").eq("clinic_id", clinicId).limit(20).then(({ data }) => {
      if (data) setPatients(data);
    });
  }, [clinicId]);

  const handleCreate = async () => {
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient) return;
    setSaving(true);
    try {
      const date = form.date || new Date().toISOString().split("T")[0];
      const endH = String(Number(form.time.split(":")[0]) + 1).padStart(2, "0");
      const { error } = await supabase.rpc("create_appointment", {
        p_clinic_id: clinicId, p_patient_id: patient.id,
        p_patient_name: patient.full_name, p_patient_phone: patient.phone,
        p_doctor_id: user?.id, p_created_by: user?.id,
        p_appointment_date: date, p_start_time: form.time,
        p_end_time: `${endH}:${form.time.split(":")[1] || "00"}`,
        p_reason: form.reason || "General checkup",
      });
      if (error) throw error;
      toast.success("Appointment created successfully");
      onNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  const canCreate = form.patientId && form.date;

  return (
    <MissionCard
      icon={CalendarDays} title="Create your first appointment" desc="Schedule a visit for your patient."
      reward="Activate WhatsApp reminders preview"
      actionLabel={saving ? "Saving..." : "Create Appointment"}
      skipLabel="Skip for now"
      onAction={handleCreate}
      onSkip={onNext}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Patient</label>
          <select value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors">
            <option value="">Select patient...</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            min={new Date().toISOString().split("T")[0]}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Time</label>
          <input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
      </div>
    </MissionCard>
  );
}

/* STEP 6 — Win Moment */
function WinMomentStep({ onNext }) {
  return <WinMomentCelebration onContinue={onNext} />;
}

/* STEP 7 — Completion + Conversion Trigger */
function CompletionStep({ onDashboard, monthlyLoss }) {
  return (
    <div className="transition-all duration-700 space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50">
          <Trophy className="size-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Your clinic is now operational</h1>
        <p className="mt-1 text-sm text-slate-500">You've completed the essential setup.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Setup progress</h3>
          <span className="text-xs font-medium text-teal-600">3/4 done</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Patient created", done: true },
            { label: "Appointment created", done: true },
            { label: "Staff added", done: false },
            { label: "WhatsApp connected", done: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${item.done ? "bg-teal-50 border-teal-200 text-teal-600" : "border-slate-300"}`}>
                {item.done ? <Check className="size-3" /> : null}
              </div>
              <span className={`text-xs ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <ConversionTrigger monthlyLoss={monthlyLoss} />

      <button
        onClick={onDashboard}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
      >
        Go to Dashboard <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
