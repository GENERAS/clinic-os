"use client";
import { useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, Clock, ArrowRight, Check, Loader2, CalendarDays, Bell, Users, Smartphone } from "lucide-react";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getOnboardingService } from "@/features/onboarding/services/onboarding.service";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const HOUR_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  HOUR_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  HOUR_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function defaultHours() {
  return DAYS.map((_, i) => ({
    day_of_week: i + 1,
    is_open: i < 5,
    open_time: "09:00",
    close_time: "17:00",
  }));
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, clinic, refresh } = useAuth();
  const [step, setStep] = useState(user ? 1 : 0);

  if (isAuthenticated && clinic?.id) {
    return <Navigate to="/dashboard" replace />;
  }
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    clinicName: "",
    clinicPhone: "",
    clinicAddress: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    operatingHours: defaultHours(),
  });

  const update = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const done = useCallback(() => {
    refresh();
    setTimeout(() => navigate("/dashboard"), 600);
  }, [navigate, refresh]);

  const handleAccountSubmit = async () => {
    setLoading(true);
    try {
      const svc = getOnboardingService();
      await svc.signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        clinicName: form.clinicName,
      });
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSubmit = () => {
    setStep(2);
  };

  const handleHoursSubmit = async () => {
    setLoading(true);
    try {
      const svc = getOnboardingService();
      await svc.completeSetup({
        clinicName: form.clinicName,
        clinicPhone: form.clinicPhone,
        clinicAddress: form.clinicAddress,
        timezone: form.timezone,
        operatingHours: form.operatingHours.filter((d) => d.is_open),
      });
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = (s) => {
    if (s === 0) return form.email && form.password && form.fullName && form.clinicName && !loading;
    if (s === 1) return form.clinicName && !loading;
    if (s === 2) return !loading;
    return true;
  };

  const handleDayToggle = (index) => {
    const updated = [...form.operatingHours];
    updated[index] = { ...updated[index], is_open: !updated[index].is_open };
    update({ operatingHours: updated });
  };

  const handleTimeChange = (index, field, value) => {
    const updated = [...form.operatingHours];
    updated[index] = { ...updated[index], [field]: value };
    update({ operatingHours: updated });
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {step === 0 && (
        <HeroStep form={form} update={update} onSubmit={handleAccountSubmit} loading={loading} canAdvance={canAdvance(0)} />
      )}
      {step === 1 && (
        <ClinicStep form={form} update={update} onSubmit={handleClinicSubmit} loading={loading} canAdvance={canAdvance(1)} />
      )}
      {step === 2 && (
        <HoursStep
          form={form}
          onDayToggle={handleDayToggle}
          onTimeChange={handleTimeChange}
          onSubmit={handleHoursSubmit}
          loading={loading}
          canAdvance={canAdvance(2)}
        />
      )}
      {step === 3 && (
        <DoneStep onDone={done} />
      )}
    </div>
  );
}

function ProgressBar({ step, total }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 transition-all duration-500 ${
            i < step ? "bg-[#635bff]" : i === step ? "bg-[#635bff] animate-pulse" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function HeroStep({ form, update, onSubmit, loading, canAdvance }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ProgressBar step={0} total={4} />

      {/* Hero */}
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-br from-[#0a2540] via-[#1a3a5c] to-[#635bff] px-6 pt-12 pb-20 text-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtMS4xLS45LTItMi0ycy0yIC45LTIgMiAuOSAyIDIgMiAyLS45IDItMnptLTIgMjRjLTEuMSAwLTIgLjktMiAycy45IDIgMiAyIDItLjkgMi0yLS45LTItMi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
            <Smartphone className="size-3.5" /> No credit card required
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Your clinic,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
              organized.
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-lg mx-auto">
            Appointments, reminders, patient records, inventory — all in one place. Start seeing patients in{" "}
            <span className="font-semibold text-white">5 minutes</span>.
          </p>

          {/* Feature badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { icon: CalendarDays, label: "Smart Scheduling" },
              { icon: Bell, label: "WhatsApp Reminders" },
              { icon: Users, label: "Patient Records" },
              { icon: Building2, label: "Inventory" },
            ].map((feat) => (
              <div key={feat.label} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70">
                <feat.icon className="size-3.5" />
                {feat.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signup form */}
      <div className="-mt-12 px-4">
        <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold">Start your free trial</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create your clinic in under a minute.</p>

          <div className="mt-5 space-y-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Your name</label>
              <input
                value={form.fullName}
                onChange={(e) => update({ fullName: e.target.value })}
                placeholder="Dr. Sarah Chen"
                className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Clinic name</label>
              <input
                value={form.clinicName}
                onChange={(e) => update({ clinicName: e.target.value })}
                placeholder="HeartCare Clinic"
                className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="sarah@heartcare.com"
                className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff] transition-colors"
              />
            </div>

            <button
              onClick={onSubmit}
              disabled={!canAdvance || loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#635bff] py-2.5 text-sm font-medium text-white hover:bg-[#5548e0] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Create my clinic
            </button>
          </div>

          {/* Trust signals */}
          <div className="mt-5 flex items-center justify-center gap-4 border-t pt-4 text-xs text-muted-foreground">
            <span>🔒 256-bit encrypted</span>
            <span>⚡ No setup fees</span>
            <span>🛑 Cancel anytime</span>
          </div>
        </div>
      </div>

      <p className="mt-6 pb-8 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-[#635bff] hover:underline">Sign in</a>
      </p>
    </div>
  );
}

function ClinicStep({ form, update, onSubmit, loading, canAdvance }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <ProgressBar step={1} total={4} />
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#635bff]/10">
            <Building2 className="size-6 text-[#635bff]" />
          </div>
          <h1 className="text-2xl font-bold">Tell us about your clinic</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">This info appears on reminders and patient communications.</p>
        </div>

        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Clinic name</label>
            <input
              value={form.clinicName}
              onChange={(e) => update({ clinicName: e.target.value })}
              placeholder="HeartCare Clinic"
              className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone number</label>
            <input
              value={form.clinicPhone}
              onChange={(e) => update({ clinicPhone: e.target.value })}
              placeholder="+1 555-0123"
              className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <input
              value={form.clinicAddress}
              onChange={(e) => update({ clinicAddress: e.target.value })}
              placeholder="123 Main St, New York, NY"
              className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!canAdvance}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#635bff] py-2.5 text-sm font-medium text-white hover:bg-[#5548e0] disabled:opacity-50 transition-colors"
        >
          Continue <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function HoursStep({ form, onDayToggle, onTimeChange, onSubmit, loading, canAdvance }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <ProgressBar step={2} total={4} />
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#635bff]/10">
            <Clock className="size-6 text-[#635bff]" />
          </div>
          <h1 className="text-2xl font-bold">Set your hours</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">When is your clinic open? You can change this later.</p>
        </div>

        <div className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          {form.operatingHours.map((day, i) => (
            <div key={day.day_of_week} className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${day.is_open ? "bg-white" : "bg-gray-50 opacity-60"}`}>
              <button
                onClick={() => onDayToggle(i)}
                className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  day.is_open ? "border-[#635bff] bg-[#635bff] text-white" : "border-gray-300"
                }`}
              >
                {day.is_open && <Check className="size-3" />}
              </button>
              <span className={`w-24 text-sm font-medium ${!day.is_open && "text-muted-foreground"}`}>{DAYS[i]}</span>
              {day.is_open && (
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={day.open_time}
                    onChange={(e) => onTimeChange(i, "open_time", e.target.value)}
                    className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-[#635bff]"
                  >
                    {HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <select
                    value={day.close_time}
                    onChange={(e) => onTimeChange(i, "close_time", e.target.value)}
                    className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-[#635bff]"
                  >
                    {HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {!day.is_open && <span className="ml-auto text-xs text-muted-foreground">Closed</span>}
            </div>
          ))}
        </div>

        <button
          onClick={onSubmit}
          disabled={!canAdvance}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#635bff] py-2.5 text-sm font-medium text-white hover:bg-[#5548e0] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Complete setup
        </button>
      </div>
    </div>
  );
}

function DoneStep({ onDone }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md animate-fade-in">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-50 border border-green-200">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
            <Check className="size-7 text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Your clinic is ready</h1>
        <p className="mt-3 text-muted-foreground">
          You can now book appointments, manage patients, track inventory, and send reminders.
        </p>
        <button
          onClick={onDone}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#635bff] px-6 py-3 text-sm font-medium text-white hover:bg-[#5548e0] transition-colors"
        >
          Go to dashboard <ArrowRight className="size-4" />
        </button>

        {/* Quick tips */}
        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {[
            { title: "Book your first appointment", desc: "Add a patient and schedule their visit." },
            { title: "Customize reminders", desc: "Set up WhatsApp or email notifications." },
            { title: "Add your staff", desc: "Invite doctors and receptionists to your clinic." },
            { title: "Set up inventory", desc: "Track medications and supplies." },
          ].map((tip) => (
            <div key={tip.title} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">{tip.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
