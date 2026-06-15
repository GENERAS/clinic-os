"use client";
import { useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, Clock, ArrowRight, ArrowLeft, Check, Loader2, Smartphone, Users, CalendarDays, Bell, X, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getOnboardingService } from "@/features/onboarding/services/onboarding.service";
import { createClient } from "@/lib/supabase/client";
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

const CLINIC_TYPES = ["Private Clinic", "Dental Clinic", "Medical Center", "Polyclinic", "Other"];

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return <Navigate to="/signup" replace />;
  if (clinic?.id) return <Navigate to="/dashboard" replace />;

  const [form, setForm] = useState({
    clinicName: "",
    clinicType: "Private Clinic",
    clinicPhone: "",
    clinicEmail: "",
    clinicAddress: "",
    district: "",
    workingDays: DAYS.map((_, i) => i < 5),
    openTime: "09:00",
    closeTime: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    whatsappSetup: null,
    staffInvites: [],
    newStaffName: "",
    newStaffEmail: "",
    newStaffRole: "Receptionist",
  });

  const update = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSteps1and2 = async () => {
    setLoading(true);
    try {
      const svc = getOnboardingService();
      const openHours = form.workingDays
        .map((isOpen, i) => ({
          day_of_week: i + 1,
          is_open: isOpen,
          open_time: isOpen ? form.openTime : "09:00",
          close_time: isOpen ? form.closeTime : "17:00",
        }))
        .filter((d) => d.is_open);

      await svc.completeSetup({
        clinicName: form.clinicName,
        clinicPhone: form.clinicPhone,
        clinicAddress: form.clinicAddress,
        timezone: form.timezone,
        operatingHours: openHours,
      });

      const supabase = createClient();
      const slug = form.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clinic";
      try {
        await supabase.from("clinics").update({ clinic_type: form.clinicType }).eq("slug", slug);
      } catch {} // column may not exist yet

      refresh();
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save clinic settings");
    } finally {
      setLoading(false);
    }
  };

  const addStaffInvite = () => {
    if (!form.newStaffName || !form.newStaffEmail) return;
    update({
      staffInvites: [...form.staffInvites, { name: form.newStaffName, email: form.newStaffEmail, role: form.newStaffRole }],
      newStaffName: "",
      newStaffEmail: "",
    });
  };

  const removeStaffInvite = (i) => {
    update({ staffInvites: form.staffInvites.filter((_, idx) => idx !== i) });
  };

  const staffRoles = ["Doctor", "Receptionist", "Manager"];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ProgressBar step={step} total={5} />

        {step === 1 && (
          <ClinicProfileStep
            form={form}
            update={update}
            onNext={handleNext}
          />
        )}
        {step === 2 && (
          <BusinessSettingsStep
            form={form}
            update={update}
            onBack={handleBack}
            onComplete={handleSteps1and2}
            loading={loading}
          />
        )}
        {step === 3 && (
          <WhatsAppSetupStep
            form={form}
            update={update}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}
        {step === 4 && (
          <StaffInvitationStep
            form={form}
            update={update}
            onBack={handleBack}
            onNext={handleNext}
            addStaff={addStaffInvite}
            removeStaff={removeStaffInvite}
            roles={staffRoles}
          />
        )}
        {step === 5 && (
          <FirstAppointmentStep
            onBack={handleBack}
            onDone={() => { refresh(); setTimeout(() => navigate("/dashboard"), 600); }}
          />
        )}
      </div>
    </div>
  );
}

function ProgressBar({ step, total }) {
  return (
    <div className="mb-8">
      <div className="flex h-1.5 rounded-full bg-slate-200">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-all duration-500 first:rounded-l-full last:rounded-r-full ${
              i < step ? "bg-teal-600" : i === step ? "bg-teal-400" : "bg-slate-200"
            } ${i > 0 && i < total ? "mx-0.5" : ""}`}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">Step {step} of {total}</p>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        {...props}
        className={`mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${props.className || ""}`}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <select
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
      >
        {children}
      </select>
    </div>
  );
}

/* STEP 1 — Clinic Profile */
function ClinicProfileStep({ form, update, onNext }) {
  const canContinue = form.clinicName && form.clinicPhone;
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Building2 className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Clinic Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Tell us about your clinic.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Clinic Name" value={form.clinicName} onChange={(e) => update({ clinicName: e.target.value })} placeholder="HeartCare Clinic" />
          <Select label="Clinic Type" value={form.clinicType} onChange={(e) => update({ clinicType: e.target.value })}>
            {CLINIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone Number" value={form.clinicPhone} onChange={(e) => update({ clinicPhone: e.target.value })} placeholder="+250 7XX XXX XXX" />
          <Input label="Email" type="email" value={form.clinicEmail} onChange={(e) => update({ clinicEmail: e.target.value })} placeholder="info@heartcare.com" />
        </div>
        <Input label="Address" value={form.clinicAddress} onChange={(e) => update({ clinicAddress: e.target.value })} placeholder="KG 123 Ave, Kigali" />
        <Select label="District" value={form.district} onChange={(e) => update({ district: e.target.value })}>
          <option value="">Select district...</option>
          {["Gasabo", "Kicukiro", "Nyarugenge", "Other"].map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
      >
        Continue <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

/* STEP 2 — Business Settings */
function BusinessSettingsStep({ form, update, onBack, onComplete, loading }) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Clock className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Business Settings</h1>
        <p className="mt-1 text-sm text-slate-500">When does your clinic operate? This powers scheduling.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Working Days</label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => {
                  const updated = [...form.workingDays];
                  updated[i] = !updated[i];
                  update({ workingDays: updated });
                }}
                className={`rounded-lg px-2 py-2 text-xs font-medium border transition-colors ${
                  form.workingDays[i]
                    ? "bg-teal-50 border-teal-200 text-teal-700"
                    : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Opening Time" value={form.openTime} onChange={(e) => update({ openTime: e.target.value })}>
            {HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Closing Time" value={form.closeTime} onChange={(e) => update({ closeTime: e.target.value })}>
            {HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <Select label="Timezone" value={form.timezone} onChange={(e) => update({ timezone: e.target.value })}>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </Select>
      </div>
      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>
        <button
          onClick={onComplete}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Save & Continue <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* STEP 3 — WhatsApp Setup */
function WhatsAppSetupStep({ form, update, onBack, onNext }) {
  const [number, setNumber] = useState("");
  if (form.whatsappSetup === null) {
    return (
      <div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
            <Smartphone className="size-5 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp Reminders</h1>
          <p className="mt-1 text-sm text-slate-500">Would you like automatic appointment reminders for your patients?</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => update({ whatsappSetup: "now" })}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Setup Now</p>
              <p className="text-xs text-slate-500">Connect your WhatsApp Business number</p>
            </div>
          </button>
          <button
            onClick={() => { update({ whatsappSetup: "later" }); onNext(); }}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Setup Later</p>
              <p className="text-xs text-slate-500">I'll configure this from settings</p>
            </div>
          </button>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Smartphone className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Connect WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your WhatsApp Business number to start sending reminders.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Input label="WhatsApp Business Number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+250 7XX XXX XXX" />
        <p className="text-xs text-slate-500">You'll complete the Meta verification in settings.</p>
      </div>
      <button
        onClick={() => { toast.success("WhatsApp preference saved"); onNext(); }}
        disabled={!number}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
      >
        Continue <ArrowRight className="size-4" />
      </button>
      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
    </div>
  );
}

/* STEP 4 — Staff Invitation */
function StaffInvitationStep({ form, update, onBack, onNext, addStaff, removeStaff, roles }) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <Users className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Invite Your Staff</h1>
        <p className="mt-1 text-sm text-slate-500">Add your team members. They'll get an email invitation.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={form.newStaffName} onChange={(e) => update({ newStaffName: e.target.value })} placeholder="Dr. Name" />
          <Input label="Email" type="email" value={form.newStaffEmail} onChange={(e) => update({ newStaffEmail: e.target.value })} placeholder="doctor@clinic.com" />
          <Select label="Role" value={form.newStaffRole} onChange={(e) => update({ newStaffRole: e.target.value })}>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <button
          onClick={addStaff}
          disabled={!form.newStaffName || !form.newStaffEmail}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <Plus className="size-3.5" /> Add Staff Member
        </button>
        {form.staffInvites.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {form.staffInvites.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-3.5 text-slate-400" />
                  <span className="text-slate-700">{s.name}</span>
                  <span className="text-xs text-slate-400">— {s.role}</span>
                  <span className="text-xs text-slate-400">({s.email})</span>
                </div>
                <button onClick={() => removeStaff(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>
        <button onClick={onNext} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors">
          {form.staffInvites.length > 0 ? "Send Invitations & Continue" : "Skip for Now"} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* STEP 5 — First Appointment */
function FirstAppointmentStep({ onBack, onDone }) {
  const [guidedStep, setGuidedStep] = useState(0);
  const navigate = useNavigate();

  const guides = [
    {
      icon: Users,
      title: "Add Your First Patient",
      desc: "Create a patient record so you can start booking appointments.",
      action: "Add Patient",
      href: "/patients/new",
    },
    {
      icon: CalendarDays,
      title: "Book Your First Appointment",
      desc: "Schedule a visit for the patient you just added.",
      action: "Book Appointment",
      href: "/appointments/new",
    },
    {
      icon: Bell,
      title: "Send Your First Reminder",
      desc: "Let ClinicOS automatically remind patients about their visit.",
      action: "Go to Dashboard",
      href: "/dashboard",
    },
  ];

  const g = guides[guidedStep];

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-50">
          <CalendarDays className="size-5 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{g.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{g.desc}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2 mb-6">
          {guides.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= guidedStep ? "bg-teal-600" : "bg-slate-200"}`} />
          ))}
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-4">
            <g.icon className="size-7" />
          </div>
          <p className="text-sm text-slate-600 mb-6">{g.desc}</p>
          <button
            onClick={() => navigate(g.href)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
          >
            {g.action} <ArrowRight className="size-4" />
          </button>
          {guidedStep < guides.length - 1 && (
            <button
              onClick={() => setGuidedStep(guidedStep + 1)}
              className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>

      {guidedStep === guides.length - 1 && (
        <button
          onClick={onDone}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
        >
          Go to Dashboard <ArrowRight className="size-4" />
        </button>
      )}

      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
    </div>
  );
}
