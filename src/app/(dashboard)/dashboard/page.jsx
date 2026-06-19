"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CalendarDays, Users, Package, Bell, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
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
import { ActivityFeedCard } from "@/features/dashboard/components/activity-feed-card";
import { ClinicOverviewCard } from "@/features/dashboard/components/clinic-overview-card";
import { TaskCard } from "@/features/dashboard/components/task-card";
import { NotificationsPanel } from "@/features/dashboard/components/notifications-panel";
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
    whatsapp_bookings: todayAppts.filter((a) => a.source === "whatsapp").length,
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
          <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent"/>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const canViewAppointments = can(permissions, "view_appointments");
  const canViewInventory = can(permissions, "view_inventory");
  const canViewPatients = can(permissions, "view_patients");

  const hasAlerts = data && (data.lowStockAlerts?.length > 0 || data.tasks?.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="Is the clinic running normally today?">
        <div className="flex items-center gap-2">
          <RealtimeStatusBadge status={realtimeStatus}/>
          <button onClick={() => loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors">
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}/>
            Refresh
          </button>
        </div>
      </PageHeader>

      {/* Live KPI strip — updates in real-time via Supabase subscription */}
      {data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {canViewAppointments && (
            <MetricCard label="Today" value={liveKpis.today_appointments} icon={<CalendarDays className="size-[18px] text-primary"/>} onClick={() => navigate("/appointments/today")}/>
          )}
          <MetricCard label="Waiting" value={liveKpis.waiting} icon={<Users className="size-[18px] text-amber-500"/>} onClick={() => navigate("/appointments/today")}/>
          <MetricCard label="Completed" value={liveKpis.completed} icon={<CalendarDays className="size-[18px] text-green-500"/>} onClick={() => navigate("/appointments/today")}/>
          {liveKpis.whatsapp_bookings > 0 && (
            <MetricCard label="WhatsApp" value={liveKpis.whatsapp_bookings} icon={<Bell className="size-[18px] text-blue-500"/>} onClick={() => navigate("/appointments/today")}/>
          )}
          {canViewPatients && (
            <MetricCard label="Patients" value={data.stats.total_patients} icon={<Users className="size-[18px] text-primary"/>} onClick={() => navigate("/patients")}/>
          )}
          {hasAlerts && (
            <MetricCard label="Alerts" value={(data.lowStockAlerts?.length || 0) + (data.tasks?.length || 0)} icon={<AlertTriangle className="size-[18px] text-amber-500"/>} onClick={() => navigate("/notifications")}/>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {canViewAppointments && (
            <SectionCard title="Today's Appointments" actions={data?.todayAppointments?.length > 0 && <button onClick={() => navigate("/appointments/today")} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all <ArrowRight className="inline size-3 ml-0.5"/></button>}>
              <AppointmentSummaryCard
                todayAppointments={todayAppts}
                upcomingAppointments={todayAppts.filter((a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "arrived")}
                onStatusChange={handleStatusChange}
                loadingStatus={loadingStatus}
              />
            </SectionCard>
          )}

          {data && data.recentActivity?.length > 0 && (
            <SectionCard title="Activity">
              <ActivityFeedCard activities={data.recentActivity}/>
            </SectionCard>
          )}
        </div>

        <div className="space-y-5">
          {hasAlerts && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="size-4 text-amber-600"/>
                <h3 className="text-sm font-semibold text-amber-800">Needs attention</h3>
              </div>
              {data.tasks?.length > 0 && <TaskCard tasks={data.tasks}/>}
              {canViewInventory && data.lowStockAlerts?.length > 0 && <AlertCard alerts={data.lowStockAlerts}/>}
            </div>
          )}

          {data && data.notifications?.length > 0 && (
            <SectionCard title="Notifications" actions={data.notifications.some(n => !n.is_read) && <button onClick={handleMarkAllRead} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Mark all read</button>}>
              <NotificationsPanel notifications={data.notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}/>
            </SectionCard>
          )}

          <SubscriptionStatusWidget
            subscription={subscriptionData.subscription}
            plan={subscriptionData.plan}
            loading={subscriptionData.loading}
          />
          <ActivationChecklist clinicId={clinicId} />
          <SectionCard title="Clinic">
            <ClinicOverviewCard clinic={data?.clinic || null}/>
          </SectionCard>
        </div>
      </div>

      {/* Empty state */}
      {data && data.stats.today_appointments === 0 && data.stats.total_patients === 0 && data.stats.total_inventory_items === 0 && data.tasks?.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/5">
            <CalendarDays className="size-6 text-primary"/>
          </div>
          <h3 className="text-lg font-semibold">Welcome to ClinicOS</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Your clinic isn't set up yet. Add your first patient or appointment to get started.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {canViewPatients && (
              <button onClick={() => navigate("/patients/new")} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Add a Patient
              </button>
            )}
            {canViewAppointments && (
              <button onClick={() => navigate("/appointments/new")} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                Book Appointment
              </button>
            )}
            {canViewInventory && (
              <button onClick={() => navigate("/inventory/new")} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                Add Inventory Item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
