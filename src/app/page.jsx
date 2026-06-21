"use client";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Bell, Users, Package, Check, ArrowRight, Smartphone, Building2, Clock, Shield, BarChart3, Menu, X, TrendingDown, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { getDemoService } from "@/features/demo/demo.service";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const BENEFITS = [
  { icon: Bell, title: "Reduce No-Shows", desc: "Automatic WhatsApp reminders reduce missed appointments so your clinic stays full." },
  { icon: Clock, title: "Save Staff Time", desc: "Less manual calling and paperwork. Receptionists focus on patients, not phone lists." },
  { icon: Users, title: "Organize Patient Records", desc: "One searchable system for all patient history — no more lost paper files." },
  { icon: BarChart3, title: "Track Daily Operations", desc: "Know what's happening instantly — appointments, inventory, staff activity in real time." },
];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600">
            <Building2 className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">ClinicOS</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="sm:hidden text-slate-500 hover:text-slate-900">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="hidden items-center gap-6 sm:flex">
          <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Login</Link>
          <Link to="/demo" className="text-sm font-medium text-teal-600 hover:text-teal-500 transition-colors">Try Demo</Link>
          <Link to="/signup" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors">Start Free Trial</Link>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900" onClick={() => setOpen(false)}>Login</Link>
            <Link to="/demo" className="text-sm font-medium text-teal-600 hover:text-teal-500" onClick={() => setOpen(false)}>Try Demo</Link>
            <Link to="/signup" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white text-center hover:bg-teal-500 transition-colors" onClick={() => setOpen(false)}>Start Free Trial</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-teal-600">
              <Building2 className="size-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">ClinicOS</span>
          </div>
          <p className="text-xs text-slate-500">The clinic operations platform for Rwandan healthcare teams.</p>
        </div>
      </div>
    </footer>
  );
}

const revenue = getDemoService().getEstimatedLostRevenue();
const fmt = (n) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* --- HERO with missed revenue trigger --- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(13,148,136,0.15)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            <Smartphone className="size-3.5" /> No credit card. 14-day free trial.
          </div>

          {/* Missed revenue trigger — visible immediately */}
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
            <TrendingDown className="size-4" />
            Your clinic could be losing {fmt(revenue.monthlyLoss)}/month from missed appointments
          </div>

          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Stop Losing Patients to<br />
            <span className="text-teal-400">Missed Appointments</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            ClinicOS helps clinics manage appointments, patients, staff, inventory, and WhatsApp reminders — all from one dashboard.
          </p>

          {/* Two entry points */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoButton />
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-lg hover:bg-slate-100 transition-all">
              <Sparkles className="size-4" /> Start Free Trial
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Shield className="size-3" /> No credit card</span>
            <span className="flex items-center gap-1"><Check className="size-3" /> 14-day trial</span>
            <span className="flex items-center gap-1"><Zap className="size-3" /> See it in 2 minutes</span>
          </div>
        </div>
      </section>

      {/* --- PROBLEM / BEFORE-AFTER --- */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500 mb-4">Before ClinicOS</h3>
              <div className="space-y-3">
                {["Receptionist writes in notebook", "Patient forgotten — no reminder sent", "Missed appointment — lost revenue", "Staff wastes hours on phone calls"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-red-100 bg-white px-4 py-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs font-bold">✕</div>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500 mb-4">After ClinicOS</h3>
              <div className="space-y-3">
                {["Appointment booked in seconds", "Automatic WhatsApp reminder sent", "Patient arrives — clinic gets paid", "Staff focuses on patients, not admin"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 text-xs font-bold">✓</div>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CORE BENEFITS --- */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">What clinics actually get</h2>
            <p className="mt-2 text-sm text-slate-500">Not features. Real outcomes that improve your practice.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <b.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA with demo button --- */}
      <section className="bg-gradient-to-br from-slate-900 to-teal-900 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">See your clinic in action</h2>
          <p className="mt-3 text-sm text-white/60">Try the demo with pre-loaded data. No signup required.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoButton />
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all">
              Start Free Trial <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* Demo button — creates instant demo clinic */
function DemoButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      if (existingUser) {
        toast("You're already signed in. Use the dashboard instead.");
        navigate("/dashboard");
        return;
      }
      const demoEmail = "demo-" + Date.now() + "@example.com";
      const demoPass = "demo123456";
      const { data, error } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPass,
        options: { data: { full_name: "Demo User" } },
      });
      if (error) {
        if (error.message.includes("rate limit") || error.status === 429) {
          toast.error("Too many sign-ups from this IP. Please wait a few minutes or register manually.");
          setLoading(false);
          return;
        }
        throw error;
      }
      if (!data.user) throw new Error("Failed to create demo user");

      const svc = getDemoService();
      await svc.createDemoClinic(data.user.id);

      toast.success("Demo clinic ready!", { description: "Email: " + demoEmail + " / Pass: " + demoPass });
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo creation failed. Try signing up instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDemo}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-teal-400/30 bg-teal-500/10 px-6 py-3 text-sm font-medium text-teal-300 hover:bg-teal-500/20 hover:text-teal-200 transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
      {loading ? "Creating..." : "Try with Demo Clinic"}
    </button>
  );
}

function Loader2({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}
