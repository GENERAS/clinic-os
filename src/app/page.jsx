"use client";
import { Link } from "react-router-dom";
import { CalendarDays, Bell, Users, Package, Check, ArrowRight, Smartphone, Building2, Clock, Shield, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";

const BENEFITS = [
  { icon: Bell, title: "Reduce No-Shows", desc: "Automatic WhatsApp reminders reduce missed appointments so your clinic stays full." },
  { icon: Clock, title: "Save Staff Time", desc: "Less manual calling and paperwork. Receptionists focus on patients, not phone lists." },
  { icon: Users, title: "Organize Patient Records", desc: "One searchable system for all patient history — no more lost paper files." },
  { icon: BarChart3, title: "Track Daily Operations", desc: "Know what's happening instantly — appointments, inventory, staff activity in real time." },
];

const AUDIENCES = [
  { title: "Private Clinics", desc: "1–20 staff looking to reduce chaos" },
  { title: "Dental Clinics", desc: "Appointment-heavy practices" },
  { title: "Medical Centers", desc: "Multiple practitioners, one system" },
  { title: "Polyclinics", desc: "Growing operations, growing complexity" },
];

const STEPS = [
  { num: "1", title: "Register your clinic", desc: "Enter your clinic name and basic info. Takes 2 minutes." },
  { num: "2", title: "Add your staff", desc: "Invite doctors and receptionists to your team." },
  { num: "3", title: "Start booking patients", desc: "Create appointments, send reminders, run your clinic." },
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
          <Link to="/signup" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors">Start Free Trial</Link>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900" onClick={() => setOpen(false)}>Login</Link>
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* --- HERO --- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(13,148,136,0.15)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            <Smartphone className="size-3.5" /> No credit card. 14-day free trial.
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Stop Losing Patients to<br />
            <span className="text-teal-400">Missed Appointments</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            ClinicOS helps clinics manage appointments, patients, staff, inventory, and WhatsApp reminders — all from one dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-600/25 hover:bg-teal-500 transition-all">
              Start Free Trial <ArrowRight className="size-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
              Book Demo
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {[
              { icon: CalendarDays, label: "Smart Scheduling" },
              { icon: Bell, label: "WhatsApp Reminders" },
              { icon: Users, label: "Patient Records" },
              { icon: Package, label: "Inventory" },
            ].map((f) => (
              <div key={f.label} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
                <f.icon className="size-3.5" />
                {f.label}
              </div>
            ))}
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

      {/* --- WHO IT'S FOR --- */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Built for Rwandan Clinics</h2>
          <p className="mt-2 text-sm text-slate-500">One platform that works for your practice size and specialty.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{a.desc}</p>
              </div>
            ))}
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

      {/* --- HOW IT WORKS --- */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Set up in 3 steps</h2>
            <p className="mt-2 text-sm text-slate-500">From zero to first patient in under 10 minutes.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex size-8 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-600">{s.num}</div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="bg-gradient-to-br from-slate-900 to-teal-900 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Start your 14-day free trial</h2>
          <p className="mt-3 text-sm text-white/60">No credit card. No commitment. Full access from day one.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-lg hover:bg-slate-100 transition-all">
              Start Free Trial <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Shield className="size-3" /> 256-bit encrypted</span>
            <span className="flex items-center gap-1"><Check className="size-3" /> No setup fees</span>
            <span className="flex items-center gap-1"><Check className="size-3" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
