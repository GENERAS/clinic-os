"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "react-router-dom";
import { DataTable, MetricCard, StatusBadge, ActionQueue, ActivityFeed } from "@/components/admin";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/utils/cn";
import { Clock, WifiOff, TrendingUp, MessageCircle, CalendarDays, Users, Loader2, Zap, DollarSign, Ban, Building2, ChevronRight, AlertTriangle, CreditCard, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

function StatusLabel({ daysLeft }) {
  if (daysLeft == null) return <span className="text-slate-400">—</span>;
  if (daysLeft <= 0) return <StatusBadge status="error" label="Expired" />;
  if (daysLeft <= 7) return <StatusBadge status="critical" label="Expiring Soon" />;
  if (daysLeft <= 14) return <StatusBadge status="warning" label="Warning" />;
  return <StatusBadge status="active" label="Active" />;
}

function DayCount({ daysLeft }) {
  if (daysLeft == null) return <span className="text-slate-400">—</span>;
  const bold = daysLeft <= 0 ? "font-bold" : "font-medium";
  return <span className={cn("text-xs", bold)}>{daysLeft}d</span>;
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    async function fetchAll() {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const [clinicsRes, usersRes, subsRes, msgsRes, logsRes, plansRes, apptsTodayRes, msgsTodayRes] = await Promise.all([
          supabase.from("clinics").select("id, status, created_at, updated_at"),
          supabase.from("users").select("id, clinic_id, last_login_at"),
          supabase.from("subscriptions").select("*, clinic_id, plan_id"),
          supabase.from("whatsapp_messages").select("id, status, created_at"),
          supabase.from("audit_logs").select("id, action, entity_type, created_at, clinic_id").order("created_at", { ascending: false }).limit(20),
          supabase.from("plans").select("id, price_monthly, name"),
          supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        ]);
        const allClinics = clinicsRes.data ?? [];
        const allUsers = usersRes.data ?? [];
        const messages = msgsRes.data ?? [];
        const plans = plansRes.data ?? [];
        const planPrices = Object.fromEntries(plans.map(p => [p.id, Number(p.price_monthly) || 0]));
        const subs = subsRes.data ?? [];
        const activeSubs = subs.filter(s => s.status === "active");
        const mrr = activeSubs.reduce((sum, s) => sum + (planPrices[s.plan_id] || 0), 0);
        const todaysMsgs = messages.filter(m => new Date(m.created_at) >= new Date(todayStart));
        const usersActive24h = allUsers.filter(u => u.last_login_at && new Date(u.last_login_at) >= new Date(oneDayAgo)).length;
        const usersActive7d = allUsers.filter(u => u.last_login_at && new Date(u.last_login_at) >= new Date(sevenDaysAgo)).length;
        const credsRes = await supabase.from("whatsapp_credentials").select("clinic_id, is_connected, health_check_passed");
        const creds = credsRes.data ?? [];
        const whatsappIssues = creds.filter(c => c.is_connected && c.health_check_passed === false).length;
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringSubs = subs.filter(s => {
          if (!s.current_period_end || s.status === "canceled" || s.status === "expired") return false;
          const end = new Date(s.current_period_end);
          return end <= sevenDaysFromNow && end > now;
        });
        const newClinicsWeek = allClinics.filter(c => new Date(c.created_at) >= new Date(sevenDaysAgo)).length;
        const activeClinics24h = [...new Set(allUsers.filter(u => u.last_login_at && new Date(u.last_login_at) >= new Date(oneDayAgo)).map(u => u.clinic_id).filter(Boolean))].length;
        const clinicMap = Object.fromEntries(allClinics.map(c => [c.id, c]));
        setData({
          totalClinics: allClinics.length, newClinicsWeek, activeClinics24h, activeClinics7d: usersActive7d,
          totalUsers: allUsers.length, activeUsers24h: usersActive24h, activeUsers7d: usersActive7d,
          mrr, arr: mrr * 12, apptsToday: apptsTodayRes.count ?? 0,
          msgsToday: msgsTodayRes.count ?? 0,
          messagesMonth: messages.filter(m => m.status === "sent" || m.status === "delivered").length,
          failedToday: todaysMsgs.filter(m => m.status === "failed").length, totalMessages: messages.length,
          expiringCount: expiringSubs.length, whatsappIssues, trialCount: subs.filter(s => s.status === "trialing").length,
          suspendedCount: allClinics.filter(c => c.status === "suspended").length,
          overdueCount: subs.filter(s => s.status === "past_due").length,
          inactiveCount: allClinics.filter(c => c.status !== "active" && c.status !== "trial" && c.status !== "suspended").length,
        });
        const enrichedSubs = subs.map(s => {
          const clinic = clinicMap[s.clinic_id];
          const plan = plans.find(p => p.id === s.plan_id);
          const daysLeft = s.current_period_end ? Math.ceil((new Date(s.current_period_end) - now) / (1000 * 60 * 60 * 24)) : null;
          return { ...s, clinicName: clinic?.name || "Unknown", planName: plan?.name || "—", planAmount: planPrices[s.plan_id] || 0, daysLeft };
        });
        enrichedSubs.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
        setSubscriptions(enrichedSubs.filter(s => s.status !== "canceled" && s.status !== "expired").slice(0, 10));
        setRecentActivity(logsRes.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  async function notifyClinics(type) {
    const label = type === "expiring" ? "expiring subscriptions" : type === "overdue" ? "overdue payments" : "clinics";
    toast.success(`Notification sent to ${label} (simulated)`);
  }

  function navigateTo(path) {
    window.location.href = path;
  }

  const subColumns = [
    { key: "clinicName", header: "Clinic", className: "font-medium text-slate-900" },
    {
      key: "planName", header: "Plan",
      render: (row) => (
        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{row.planName}</span>
      ), sortable: false,
    },
    { key: "planAmount", header: "Amount", render: (row) => <span className="text-xs text-slate-600">${row.planAmount}/mo</span> },
    { key: "daysLeft", header: "Days Left", render: (row) => <DayCount daysLeft={row.daysLeft} /> },
    { key: "status", header: "Status", render: (row) => <StatusLabel daysLeft={row.daysLeft} /> },
    {
      key: "actions", header: "", sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => toast.success("Reminder sent (simulated)")}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Remind</button>
          <Link to="/admin/clinics"
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">View</Link>
        </div>
      ),
    },
  ];

  const actionsItems = [
    { severity: "critical", clinic: "Suspended Clinics", problem: "Awaiting review", actions: [], link: { onClick: () => navigateTo("/admin/clinics?status=suspended") } },
    { severity: "high", clinic: "Expiring Subs", problem: "Remind clinics about upcoming expiration", actions: [{ label: "Notify", onClick: () => notifyClinics("expiring") }] },
    { severity: "medium", clinic: "Failed WhatsApp", problem: "Re-attempt failed message delivery", actions: [], link: { onClick: () => navigateTo("/admin/whatsapp-health") } },
    { severity: "low", clinic: "Create Clinic", problem: "Register a new clinic", actions: [], link: { onClick: () => navigateTo("/admin/clinics") } },
    { severity: "low", clinic: "Broadcast", problem: "Send announcement to all clinics", actions: [], link: { onClick: () => navigateTo("/admin/notifications") } },
  ];

  const activityItems = recentActivity.slice(0, 12).map(log => {
    const actionMap = { created: "success", deleted: "error", suspended: "error", login: "info", logout: "neutral", updated: "warning", renewed: "success", payment_failed: "error" };
    return {
      type: actionMap[log.action] || "neutral",
      entity: log.action?.replace(/_/g, " ") || "action",
      action: log.entity_type,
      detail: "",
      time: new Date(log.created_at).toLocaleString(),
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Build urgency-ordered metric cards
  const metricCards = [];

  // 1. FAILED
  if (data.whatsappIssues > 0) {
    metricCards.push(
      <MetricCard key="whatsapp" icon={WifiOff} label="WhatsApp failures" value={data.whatsappIssues}
        variant="failed" action={{ label: "Investigate", onClick: () => navigateTo("/admin/whatsapp-health") }} />
    );
  }
  if (data.overdueCount > 0) {
    metricCards.push(
      <MetricCard key="overdue" icon={DollarSign} label="Overdue payments" value={data.overdueCount}
        variant="failed" action={{ label: "Send reminder", onClick: () => notifyClinics("overdue") }} />
    );
  }
  if (data.suspendedCount > 0) {
    metricCards.push(
      <MetricCard key="suspended" icon={Ban} label="Suspended clinics" value={data.suspendedCount}
        variant="failed" action={{ label: "Review", onClick: () => navigateTo("/admin/clinics?status=suspended") }} />
    );
  }

  // 2. WARNINGS
  if (data.expiringCount > 0) {
    metricCards.push(
      <MetricCard key="expiring" icon={Clock} label="Expiring subscriptions" value={data.expiringCount}
        variant="warning" action={{ label: "Notify all", onClick: () => notifyClinics("expiring") }} />
    );
  }

  // 3. PENDING
  if (data.trialCount > 0) {
    metricCards.push(
      <MetricCard key="trial" icon={CreditCard} label="Trial clinics" value={data.trialCount}
        variant="pending" action={{ label: "View", onClick: () => navigateTo("/admin/clinics") }} />
    );
  }
  metricCards.push(
    <MetricCard key="newClinics" icon={Zap} label="New clinics (7d)" value={data.newClinicsWeek}
      variant="pending" action={{ label: "View", onClick: () => navigateTo("/admin/clinics") }} />
  );

  // 4. HEALTHY
  metricCards.push(
    <MetricCard key="mrr" icon={TrendingUp} label="MRR" value={`$${data.mrr?.toLocaleString() || "0"}`}
      trend={data.mrr > 0 ? 12 : 0} variant="healthy" />
  );
  metricCards.push(
    <MetricCard key="activeClinics" icon={Building2} label="Active clinics (24h)" value={data.activeClinics24h}
      sub={`${data.activeClinics7d} last 7d`} variant="healthy" />
  );
  metricCards.push(
    <MetricCard key="appts" icon={CalendarDays} label="Appointments today" value={data.apptsToday?.toLocaleString() || "0"}
      variant="healthy" />
  );
  metricCards.push(
    <MetricCard key="msgs" icon={MessageCircle} label="WhatsApp messages" value={data.msgsToday?.toLocaleString() || "0"}
      sub={`${data.messagesMonth?.toLocaleString() || 0} this month`} variant="healthy" />
  );
  metricCards.push(
    <MetricCard key="users" icon={Users} label="Active users (24h)" value={data.activeUsers24h}
      sub={`${data.activeUsers7d} last 7d`} variant="healthy" />
  );
  metricCards.push(
    <MetricCard key="sent" icon={CheckCircle2} label="Messages sent (month)" value={data.messagesMonth?.toLocaleString() || "0"}
      variant="healthy" />
  );

  // Count failures/warnings for grid ordering
  const failureCount = metricCards.filter(c => c.key && ["whatsapp", "overdue", "suspended"].includes(c.key)).length;
  const warningCount = metricCards.filter(c => c.key === "expiring").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}>
        <Link to="/admin/clinics" className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm">
          <Building2 className="size-4" /> New Clinic
        </Link>
      </PageHeader>

      {/* FAILED SECTION */}
      {(data.whatsappIssues > 0 || data.overdueCount > 0 || data.suspendedCount > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="size-4 text-red-500" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-600">Needs attention</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.whatsappIssues > 0 && (
              <MetricCard icon={WifiOff} label="WhatsApp failures" value={data.whatsappIssues}
                variant="failed" action={{ label: "Investigate", onClick: () => navigateTo("/admin/whatsapp-health") }} />
            )}
            {data.overdueCount > 0 && (
              <MetricCard icon={DollarSign} label="Overdue payments" value={data.overdueCount}
                variant="failed" action={{ label: "Send reminder", onClick: () => notifyClinics("overdue") }} />
            )}
            {data.suspendedCount > 0 && (
              <MetricCard icon={Ban} label="Suspended clinics" value={data.suspendedCount}
                variant="failed" action={{ label: "Review", onClick: () => navigateTo("/admin/clinics?status=suspended") }} />
            )}
          </div>
        </div>
      )}

      {/* WARNINGS SECTION */}
      {data.expiringCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600">Warnings</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Clock} label="Expiring subscriptions" value={data.expiringCount}
              variant="warning" action={{ label: "Notify all", onClick: () => notifyClinics("expiring") }} />
          </div>
        </div>
      )}

      {/* PENDING SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-blue-500" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-600">Pending</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.trialCount > 0 && (
            <MetricCard icon={CreditCard} label="Trial clinics" value={data.trialCount}
              variant="pending" action={{ label: "View", onClick: () => navigateTo("/admin/clinics") }} />
          )}
          <MetricCard icon={Zap} label="New clinics (7d)" value={data.newClinicsWeek}
            variant="pending" action={{ label: "View", onClick: () => navigateTo("/admin/clinics") }} />
        </div>
      </div>

      {/* 2-COLUMN LAYOUT: METRICS + SIDEBAR */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* HEALTHY METRICS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="size-4 text-slate-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform Metrics</h2>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <MetricCard icon={TrendingUp} label="MRR" value={`$${data.mrr?.toLocaleString() || "0"}`}
                trend={data.mrr > 0 ? 12 : 0} variant="healthy" />
              <MetricCard icon={Building2} label="Active clinics (24h)" value={data.activeClinics24h}
                sub={`${data.activeClinics7d} last 7d`} variant="healthy" />
              <MetricCard icon={CalendarDays} label="Appointments today" value={data.apptsToday?.toLocaleString() || "0"}
                variant="healthy" />
              <MetricCard icon={MessageCircle} label="WhatsApp messages" value={data.msgsToday?.toLocaleString() || "0"}
                sub={`${data.messagesMonth?.toLocaleString() || 0} this month`} variant="healthy" />
              <MetricCard icon={Users} label="Active users (24h)" value={data.activeUsers24h}
                sub={`${data.activeUsers7d} last 7d`} variant="healthy" />
              <MetricCard icon={CheckCircle2} label="Messages sent (month)" value={data.messagesMonth?.toLocaleString() || "0"}
                variant="healthy" />
            </div>
          </div>

          {/* SUBSCRIPTION MONITOR TABLE */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Subscription Monitor</h2>
              </div>
              <Link to="/admin/subscriptions" className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">
                View all <ChevronRight className="size-3" />
              </Link>
            </div>
            <DataTable
              columns={subColumns}
              data={subscriptions}
              keyField="id"
              sortable={false}
              emptyMessage="No active subscriptions."
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <ActionQueue items={actionsItems} emptyMessage="All clear" />
          <ActivityFeed items={activityItems} emptyMessage="No recent activity." />
        </div>
      </div>
    </div>
  );
}
