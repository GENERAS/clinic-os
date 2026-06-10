"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  CalendarDays,
  Users,
  Package,
  Activity,
  Bell,
  RefreshCw,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { can } from "@/features/auth/utils/permissions"
import { getDashboardService } from "@/features/dashboard/services/dashboard.service"
import { getAppointmentService } from "@/features/appointments/services/appointment.service"
import { MetricCard } from "@/features/dashboard/components/metric-card"
import { AppointmentSummaryCard } from "@/features/dashboard/components/appointment-summary-card"
import { AlertCard } from "@/features/dashboard/components/alert-card"
import { ActivityFeedCard } from "@/features/dashboard/components/activity-feed-card"
import { ClinicOverviewCard } from "@/features/dashboard/components/clinic-overview-card"
import { TaskCard } from "@/features/dashboard/components/task-card"
import { NotificationsPanel } from "@/features/dashboard/components/notifications-panel"
import type { DashboardOverview } from "@/features/dashboard/types"
import type { AppointmentStatus } from "@/features/appointments/types"
import { toast } from "sonner"

export default function DashboardPage() {
  const router = useRouter()
  const { user, clinic: authClinic, permissions } = useAuth()
  const clinicId = authClinic?.id

  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)

  const dashboardService = useMemo(() => getDashboardService(), [])
  const appointmentService = useMemo(() => getAppointmentService(), [])

  const loadDashboard = useCallback(async (silent = false) => {
    if (!clinicId) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const overview = await dashboardService.getDashboardOverview(clinicId)
      setData(overview)
    } catch {
      if (!silent) toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [clinicId, dashboardService])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    if (!clinicId || !user) return
    setLoadingStatus(appointmentId)
    try {
      await appointmentService.changeStatus(clinicId, appointmentId, newStatus, user.id)
      toast.success(`Appointment ${newStatus}`)
      loadDashboard(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setLoadingStatus(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    if (!clinicId) return
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.from("notifications").update({ is_read: true }).eq("id", id)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
        }
      })
    } catch {}
  }

  const handleMarkAllRead = async () => {
    if (!clinicId) return
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("clinic_id", clinicId)
        .eq("is_read", false)
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, notifications: prev.notifications.map((n) => ({ ...n, is_read: true })) }
      })
      toast.success("All notifications marked as read")
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const canViewAppointments = can(permissions, "view_appointments")
  const canViewInventory = can(permissions, "view_inventory")
  const canViewPatients = can(permissions, "view_patients")
  const canViewStaff = can(permissions, "view_staff")

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Daily operations at a glance">
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {canViewAppointments && (
            <MetricCard
              label="Today's Appointments"
              value={data.stats.today_appointments}
              icon={<CalendarDays className="size-5 text-primary" />}
              onClick={() => router.push("/appointments/today")}
            />
          )}
          {canViewPatients && (
            <MetricCard
              label="Total Patients"
              value={data.stats.total_patients}
              icon={<Users className="size-5 text-blue-500" />}
              onClick={() => router.push("/patients")}
            />
          )}
          {canViewAppointments && (
            <MetricCard
              label="Total Appointments"
              value={data.stats.total_appointments}
              icon={<Activity className="size-5 text-emerald-500" />}
              onClick={() => router.push("/appointments")}
            />
          )}
          {canViewInventory && (
            <MetricCard
              label="Inventory Items"
              value={data.stats.total_inventory_items}
              icon={<Package className="size-5 text-amber-500" />}
              onClick={() => router.push("/inventory")}
            />
          )}
          {canViewStaff && (
            <MetricCard
              label="Staff Members"
              value={data.stats.total_staff}
              icon={<Users className="size-5 text-purple-500" />}
              onClick={() => router.push("/settings/staff")}
            />
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — appointments & activity */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Appointments */}
          {canViewAppointments && (
            <SectionCard title="Today's Appointments">
              <AppointmentSummaryCard
                todayAppointments={data?.todayAppointments || []}
                upcomingAppointments={data?.upcomingAppointments || []}
                onStatusChange={handleStatusChange}
                loadingStatus={loadingStatus}
              />
            </SectionCard>
          )}

          {/* Recent Activity */}
          {data && data.recentActivity.length > 0 && (
            <SectionCard title="Recent Activity">
              <ActivityFeedCard activities={data.recentActivity} />
            </SectionCard>
          )}
        </div>

        {/* Right column — alerts, tasks, clinic info */}
        <div className="space-y-6">
          {/* Tasks requiring attention */}
          {data && data.tasks.length > 0 && (
            <SectionCard title="Tasks">
              <TaskCard tasks={data.tasks} />
            </SectionCard>
          )}

          {/* Low Stock Alerts */}
          {canViewInventory && data && data.lowStockAlerts.length > 0 && (
            <SectionCard title="Low Stock Alerts">
              <AlertCard alerts={data.lowStockAlerts} />
            </SectionCard>
          )}

          {/* Notifications */}
          {data && data.notifications.length > 0 && (
            <SectionCard title="Notifications" icon={<Bell className="size-4" />}>
              <NotificationsPanel
                notifications={data.notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
            </SectionCard>
          )}

          {/* Clinic Overview */}
          <SectionCard title="Clinic Overview">
            <ClinicOverviewCard clinic={data?.clinic || null} />
          </SectionCard>
        </div>
      </div>

      {/* Empty state when nothing is set up yet */}
      {data &&
        data.stats.today_appointments === 0 &&
        data.stats.total_patients === 0 &&
        data.stats.total_inventory_items === 0 &&
        data.tasks.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">Welcome to ClinicOS</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first items to the system.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {canViewPatients && (
              <button
                onClick={() => router.push("/patients/new")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add a Patient
              </button>
            )}
            {canViewAppointments && (
              <button
                onClick={() => router.push("/appointments/new")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Book Appointment
              </button>
            )}
            {canViewInventory && (
              <button
                onClick={() => router.push("/inventory/new")}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Add Inventory Item
              </button>
            )}
            {canViewStaff && (
              <button
                onClick={() => router.push("/settings/staff")}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Invite Staff
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
