"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CalendarDays, Users, Package, Bell, RefreshCw, AlertTriangle, ArrowRight, Stethoscope, Beaker, Heart, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { can } from "@/features/auth/utils/permissions";
import { getDashboardService } from "@/features/dashboard/services/dashboard.service";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { createClient } from "@/lib/supabase/client";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { AppointmentSummaryCard } from "@/features/dashboard/components/appointment-summary-card";
import { AlertCard } from "@/features/dashboard/components/alert-card";
import { NotificationsPanel } from "@/features/dashboard/components/notifications-panel";
import { ClinicOverviewCard } from "@/features/dashboard/components/clinic-overview-card";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { ActivationChecklist } from "@/components/dashboard/activation-checklist";
import { SubscriptionStatusWidget } from "@/features/subscription/components/subscription-status-widget";
import { getSubscriptionService } from "@/features/subscription/services/subscription.service";
import { toast } from "sonner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, clinic: authClinic, permissions } = useAuth();
  const clinicId = authClinic?.id;

  if (authClinic?.id && authClinic?.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({ subscription: null, plan: null, loading: true });
  const [clinicalCounts, setClinicalCounts] = useState({ consultations: 0, pendingLabs: 0, triageWaiting: 0 });
  const dashboardService = useMemo(() => getDashboardService(), []);
  const appointmentService = useMemo(() => getAppointmentService(), []);
  const subscriptionService = useMemo(() => getSubscriptionService(), []);

  const { appointments, status: realtimeStatus } = useRealtimeAppointments(clinicId);

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = useMemo(() => {
    return appointments.filter((a) => a.appointment_date === today);
  }, [appointments, today]);

  const liveKpis = useMemo(() => ({
    today_appointments: todayAppts.length,
    waiting: todayAppts.filter((a) => a.status === "arrived").length,
    completed: todayAppts.filter((a) => a.status === "completed").length,
    no_shows: todayAppts.filter((a) => a.status === "no_show" || a.status === "cancelled").length,
  }), [todayAppts]);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!clinicId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const overview = await dashboardService.getDashboardOverview(clinicId);
      setData(overview);

      const today = new Date().toISOString().split("T")[0];
      const supabase = createClient();
      const [{ count: consultations }, { count: pendingLabs }, { count: triageWaiting }] = await Promise.all([
        supabase.from("consultations").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", today),
        supabase.from("investigations").select("*", { count: "exact", head: true }).in("status", ["ordered", "sample_collected"]),
        supabase.from("triage_records").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "waiting"),
      ]);
      setClinicalCounts({ consultations: consultations || 0, pendingLabs: pendingLabs || 0, triageWaiting: triageWaiting || 0 });
    } catch {
      if (!silent) toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, dashboardService]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!clinicId) return;
    setSubscriptionData((prev) => ({ ...prev, loading: true }));
    subscriptionService.getSubscription(clinicId).then((sub) => {
      setSubscriptionData({ subscription: sub, plan: sub?.plans || null, loading: false });
    }).catch(() => {
      setSubscriptionData({ subscription: null, plan: null, loading: false });
    });
  }, [clinicId]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    if (!clinicId || !user) return;
    setLoadingStatus(appointmentId);
    try {
      await appointmentService.changeStatus(clinicId, appointmentId, newStatus, user.id);
      toast.success(`Appointment ${newStatus}`);
      loadDashboard(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleMarkRead = async (id) => {
    if (!clinicId) return;
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, notifications: prev.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n) };
      });
    } catch { }
  };

  const handleMarkAllRead = async () => {
    if (!clinicId) return;
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("clinic_id", clinicId).eq("is_read", false);
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, notifications: prev.notifications.map((n) => ({ ...n, is_read: true })) };
      });
      toast.success("All notifications marked as read");
    } catch { }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const canViewAppointments = can(permissions, "view_appointments");
  const canViewInventory = can(permissions, "view_inventory");
  const canViewPatients = can(permissions, "view_patients");
  const hasAlerts = data && (data.lowStockAlerts?.length > 0 || data.tasks?.length > 0);
  const hasNotifications = data && data.notifications?.length > 0;
  const isEmpty = data && data.stats.today_appointments === 0 && data.stats.total_patients === 0 && data.stats.total_inventory_items === 0 && data.tasks?.length === 0;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500">{authClinic?.name} &middot; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeStatusBadge status={realtimeStatus} />
          <button onClick={() => loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Big Number Strip ── */}
      {data && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          <MetricCard label="Waiting now" value={liveKpis.waiting} icon={<Users className="size-4 text-amber-500" />} onClick={() => navigate("/appointments/today")} />
          <MetricCard label="Today" value={liveKpis.today_appointments} icon={<CalendarDays className="size-4 text-blue-500" />} onClick={() => navigate("/appointments/today")} />
          <MetricCard label="Completed" value={liveKpis.completed} icon={<CheckCircle2 className="size-4 text-green-500" />} onClick={() => navigate("/appointments/today")} />
          <MetricCard label="Consultations" value={clinicalCounts.consultations} icon={<Stethoscope className="size-4 text-purple-500" />} onClick={() => navigate("/consultations/new")} />
          {hasAlerts ? (
            <MetricCard label="Alerts" value={(data.lowStockAlerts?.length || 0) + (data.tasks?.length || 0)} icon={<AlertTriangle className="size-4 text-rose-500" />} onClick={() => navigate("/notifications")} />
          ) : (
            <MetricCard label="All clear" value={0} icon={<CheckCircle2 className="size-4 text-green-500" />} />
          )}
        </div>
      )}

      {/* ── Main 2-col grid ── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">

        {/* ── Left: Appointments ── */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {canViewAppointments && !isEmpty && (
            <SectionCard
              title={
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-blue-500" />
                  <span>Today's Appointments</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{liveKpis.today_appointments}</span>
                </div>
              }
              actions={data?.todayAppointments?.length > 0 && (
                <button onClick={() => navigate("/appointments/today")} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  View all <ArrowRight className="inline size-3 ml-0.5" />
                </button>
              )}
            >
              <AppointmentSummaryCard
                todayAppointments={todayAppts}
                upcomingAppointments={todayAppts.filter((a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "arrived")}
                onStatusChange={handleStatusChange}
                loadingStatus={loadingStatus}
              />
            </SectionCard>
          )}

          {/* ── Clinical row (compact 3-col inside left) ── */}
          {!isEmpty && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button onClick={() => navigate("/triage")} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm hover:bg-slate-50 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50">
                  <Heart className="size-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{clinicalCounts.triageWaiting}</p>
                  <p className="text-[11px] text-slate-500">Triage waiting</p>
                </div>
              </button>
              <button onClick={() => navigate("/investigations")} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm hover:bg-slate-50 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50">
                  <Beaker className="size-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{clinicalCounts.pendingLabs}</p>
                  <p className="text-[11px] text-slate-500">Pending labs</p>
                </div>
              </button>
              <button onClick={() => navigate("/patients/new")} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm hover:bg-slate-50 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                  <Users className="size-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{data?.stats?.total_patients ?? 0}</p>
                  <p className="text-[11px] text-slate-500">Total patients</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-2 sm:space-y-3">

          {/* Alerts */}
          {hasAlerts && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="size-3.5 text-amber-600" />
                <h3 className="text-xs font-semibold text-amber-800">Needs attention</h3>
              </div>
              <div className="space-y-1.5">
                {data.tasks?.length > 0 && data.tasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs">
                    {t.type === "pending_invitations" ? <Users className="size-3 text-amber-500" /> : <Package className="size-3 text-amber-500" />}
                    <span className="text-slate-700">{t.label}</span>
                  </div>
                ))}
                {canViewInventory && data.lowStockAlerts?.length > 0 && (
                  <AlertCard alerts={data.lowStockAlerts} />
                )}
              </div>
            </div>
          )}

          {/* Notifications compact */}
          {hasNotifications && (
            <SectionCard title={
              <div className="flex items-center gap-1.5">
                <Bell className="size-3.5 text-slate-500" />
                <span className="text-xs font-semibold">Notifications</span>
                {data.notifications.some(n => !n.is_read) && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                    {data.notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </div>
            } actions={data.notifications.some(n => !n.is_read) && <button onClick={handleMarkAllRead} className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors">Mark all read</button>}>
              <div className="max-h-[180px] overflow-y-auto">
                <NotificationsPanel notifications={data.notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />
              </div>
            </SectionCard>
          )}

          {/* Subscription + Clinic + Activation in one row of small cards */}
          <div className="space-y-2">
            <SubscriptionStatusWidget
              subscription={subscriptionData.subscription}
              plan={subscriptionData.plan}
              loading={subscriptionData.loading}
            />
            <SectionCard title="Clinic">
              <ClinicOverviewCard clinic={data?.clinic || null} />
            </SectionCard>
            <ActivationChecklist clinicId={clinicId} />
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-teal-50">
            <CalendarDays className="size-6 text-teal-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Welcome to ClinicOS</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
            Your clinic isn't set up yet. Add your first patient or appointment to get started.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canViewPatients && (
              <button onClick={() => navigate("/patients/new")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Add a Patient
              </button>
            )}
            {canViewAppointments && (
              <button onClick={() => navigate("/appointments/new")} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Book Appointment
              </button>
            )}
            {canViewInventory && (
              <button onClick={() => navigate("/inventory/new")} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Add Inventory Item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
