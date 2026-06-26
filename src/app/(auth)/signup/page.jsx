"use client";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import { authService } from "@/features/auth/services/auth.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function SignupPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) return;
    setLoading(true);
    try {
      await authService.signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
      });
      await refresh();
      const session = await authService.getSession();
      if (session?.user) {
        toast.success("Account created! Let's set up your clinic.");
        navigate("/onboarding");
      } else {
        toast.success("Account created! Please check your email to confirm your account.");
        navigate("/login");
      }
    } catch (err) {
      toast.error(handleApiError(err, "Failed to create account"));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.fullName && form.email && form.password && !loading;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-teal-600">
          <Building2 className="size-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Start your free trial</h1>
        <p className="mt-1 text-sm text-slate-500">Create your account in under a minute.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-medium text-slate-500">Owner Name</label>
          <input
            value={form.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            placeholder="Dr. Sarah Chen"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="sarah@clinic.com"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Phone Number</label>
          <input
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="+250 7XX XXX XXX"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update({ password: e.target.value })}
            placeholder="At least 6 characters"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Create Account
        </button>
      </form>

      <div className="flex items-center justify-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span>256-bit encrypted</span>
        <span>No setup fees</span>
        <span>Cancel anytime</span>
      </div>

      <p className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-teal-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
