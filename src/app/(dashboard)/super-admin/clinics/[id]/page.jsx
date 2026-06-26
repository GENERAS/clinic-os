"use client";
import { PageHeader } from "@/components/shared/page-header";

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Loader2, Building2, Mail, Phone, Calendar,
  Users, Package, MessageCircle, CreditCard, Wifi, Clock,
  Activity, ChevronDown, Ban, CheckCircle, Send
} from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

function cn(...classes) { return classes.filter(Boolean).join(" "); }

const TABS = ["Overview", "Usage", "Users", "Billing", "WhatsApp"];

export default function ClinicDetail() {
  const { id } = useParams();
  const [clinic, setClinic] = useState(null);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [whatsapp, setWhatsapp] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function fetch() {
      try {
        const [clinicRes, plansRes, usersRes, subsRes, credsRes,
          patientsRes, apptsRes, inventoryRes] = await Promise.all([
          supabase.from("clinics").select("*").eq("id", id).single(),
          supabase.from("plans").select("*").order("sort_order"),
          supabase.from("users").select("id, full_name, email, status, last_login_at, is_super_admin")
            .eq("clinic_id", id).order("created_at", { ascending: false }),
          supabase.from("subscriptions").select("*").eq("clinic_id", id).maybeSingle(),
          supabase.from("whatsapp_credentials").select("*").eq("clinic_id", id).maybeSingle(),
          supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", id),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", id),
          supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("clinic_id", id),
        ]);

        if (clinicRes.error) return;

        const clinicData = clinicRes.data;
        setClinic(clinicData);
        setPlans(plansRes.data ?? []);
        setUsers(usersRes.data ?? []);
        setSubscription(subsRes.data);
        setWhatsapp(credsRes.data);
        setPlan(plansRes.data?.find((p) => p.id === clinicData.plan_id) || null);
        setStats({
          patients: patientsRes.count ?? 0,
          appointments: apptsRes.count ?? 0,
          inventory: inventoryRes.count ?? 0,
          staff: usersRes.data?.length ?? 0,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [id]);

  const supabase = createClient();

  async function updateStatus(newStatus) {
    try {
      await supabase.from("clinics").update({ status: newStatus }).eq("id", id);
      setClinic((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Clinic ${newStatus === "suspended" ? "suspended" : "reactivated"}`);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update"));
    }
  }

  async function updatePlan(newPlanId) {
    try {
      const planData = plans.find((p) => p.id === newPlanId);
      if (subscription) {
        await supabase.from("subscriptions").update({
          plan_id: newPlanId,
          status: Number(planData?.price_monthly || 0) > 0 ? "active" : "trialing",
        }).eq("id", subscription.id);
      } else {
        await supabase.from("subscriptions").insert({
          clinic_id: id, plan_id: newPlanId, status: "active",
          billing_cycle: "monthly",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      await supabase.from("clinics").update({ plan_id: newPlanId }).eq("id", id);
      setPlan(planData);
      toast.success("Plan updated");
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update plan"));
    }
  }

  async function deactivateUser(userId) {
    try {
      const user = users.find((u) => u.id === userId);
      const newStatus = user?.status === "suspended" ? "active" : "suspended";
      await supabase.from("users").update({ status: newStatus }).eq("id", userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(newStatus === "suspended" ? "User deactivated" : "User activated");
    } catch (err) {
      toast.error(handleApiError(err, "Operation failed"));
    }
  }

  async function resetPassword(email) {
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      toast.success(`Password reset email sent to ${email}`);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to send reset email"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Clinic not found.</p>
        <Link to="/admin/clinics" className="text-primary hover:underline text-sm">Back to clinics</Link>
      </div>
    );
  }

  const daysLeft = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/clinics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Clinics
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="size-6 text-primary" />
          </div>
          <PageHeader title={clinic.name} description={`${clinic.slug} · ${clinic.email || "—"}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium",
            clinic.status === "active" ? "bg-muted text-foreground"
            : clinic.status === "suspended" ? "bg-muted text-muted-foreground"
            : "bg-muted text-muted-foreground")}>{clinic.status}</span>
          <button onClick={() => updateStatus(clinic.status === "suspended" ? "active" : "suspended")}
className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            clinic.status === "suspended"
              ? "border text-foreground hover:bg-accent"
              : "border text-muted-foreground hover:bg-accent"
            )}>          
            {clinic.status === "suspended" ? "Activate" : "Suspend"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Clinic Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" /> {clinic.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" /> {clinic.phone || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" /> Registered: {new Date(clinic.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Subscription</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium rounded bg-primary/10 px-2 py-0.5 text-primary">{plan?.name || "Free"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">${Number(plan?.price_monthly || 0).toFixed(0)}/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Renewal</span>
                <span className="font-medium">
                  {subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {daysLeft != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Days Left</span>
                  <span className="font-medium text-muted-foreground">
                    {daysLeft}d
                  </span>
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <select onChange={(e) => e.target.value && updatePlan(e.target.value)}
                  className="rounded border bg-white px-3 py-1.5 text-xs outline-none focus:border-primary flex-1">
                  <option value="">Change Plan</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>)}
                </select>
                {subscription?.status === "active" && daysLeft != null && daysLeft <= 14 && (
                  <button onClick={() => toast.success("Trial extended (simulated)")}
                    className="rounded border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                    Extend
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Usage" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
              <Users className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-2xl font-bold">{stats.staff}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
              <Activity className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-2xl font-bold">{stats.patients}</p>
              <p className="text-xs text-muted-foreground">Patients</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
              <Calendar className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-2xl font-bold">{stats.appointments}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
              <Package className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-2xl font-bold">{stats.inventory}</p>
              <p className="text-xs text-muted-foreground">Inventory Items</p>
            </div>
          </div>
        </div>
      )}

      {tab === "Users" && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Clinic Users ({users.length})</h2>
          </div>
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left text-xs font-semibold text-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {u.is_super_admin ? "Super Admin" : "User"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        u.status === "active" ? "bg-muted text-foreground" : "bg-muted text-muted-foreground")}>{u.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => deactivateUser(u.id)}
                          className={cn("rounded border px-2 py-1 text-xs font-medium",
                            u.status === "suspended"
                              ? "border text-foreground hover:bg-accent"
                              : "border text-muted-foreground hover:bg-accent"
                          )}>
                          {u.status === "suspended" ? "Activate" : "Deactivate"}
                        </button>
                        <button onClick={() => resetPassword(u.email)}
                          className="rounded border bg-white px-2 py-1 text-xs font-medium hover:bg-accent">
                          Reset Pwd
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Billing" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Current Plan</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{plan?.name || "Free"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-lg font-bold">${Number(plan?.price_monthly || 0).toFixed(0)}/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                  subscription?.status === "active" ? "bg-muted text-foreground"
                  : subscription?.status === "trialing" ? "bg-muted text-foreground"
                  : "bg-muted text-muted-foreground")}>{subscription?.status || "No subscription"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Renewal</span>
                <span className="font-medium">
                  {subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {daysLeft != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Days Left</span>
                  <span className="font-medium text-muted-foreground">
                    {daysLeft}d
                  </span>
                </div>
              )}
              <div className="pt-3 flex flex-wrap gap-2">
                <select onChange={(e) => e.target.value && updatePlan(e.target.value)}
                  className="rounded border bg-white px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">Change Plan</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>)}
                </select>
                <button onClick={() => toast.success("Trial extended (simulated)")}
                  className="rounded border bg-white px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  Extend Trial
                </button>
                <button onClick={() => toast.success("Billing suspended (simulated)")}
                  className="rounded border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                  Suspend Billing
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Plan Features</h2>
            {plan ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span>Up to {plan.max_staff} staff members</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  <span>WhatsApp: {plan.whatsapp_enabled ? "Enabled" : "Not included"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No plan selected.</p>
            )}
          </div>
        </div>
      )}

      {tab === "WhatsApp" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-10 items-center justify-center rounded-lg",
                  whatsapp?.is_connected ? "bg-muted" : "bg-muted")}>
                  <Wifi className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold">{whatsapp?.is_connected ? "Connected" : "Disconnected"}</p>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
                  <Phone className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate">{whatsapp?.phone_number || "—"}</p>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <MessageCircle className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.appointments || "—"}</p>
                  <p className="text-xs text-muted-foreground">Messages Sent</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <AlertTriangle className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Failures</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => toast.success("Testing connection (simulated)")}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Test Connection
            </button>
            <button onClick={() => toast.success("Reconnecting (simulated)")}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Reconnect
            </button>
            <button onClick={() => toast.success("Opening logs (simulated)")}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              View Logs
            </button>
          </div>

          {whatsapp && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3">Connection Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Health Check</span>
                  <span>{whatsapp.last_health_check_at ? new Date(whatsapp.last_health_check_at).toLocaleString() : "Never"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Health Check Passed</span>
                  <span className={whatsapp.health_check_passed ? "text-foreground" : "text-muted-foreground"}>
                    {whatsapp.health_check_passed == null ? "—" : whatsapp.health_check_passed ? "Yes" : "No"}
                  </span>
                </div>
                {whatsapp.failure_reason && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Failure Reason</span>
                    <span className="text-muted-foreground">{whatsapp.failure_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
