import { createClient } from "@/lib/supabase/client"
import type { Clinic } from "@/types/database"
import type { AppointmentStatus } from "@/features/appointments/types"
import type {
  DashboardOverview,
  TodayAppointment,
  UpcomingAppointment,
  LowStockAlert,
  DashboardActivity,
  DashboardNotification,
  DashboardTask,
  DashboardStats,
  ClinicInfo,
} from "../types"

export function getDashboardService() {
  const supabase = createClient()

  const getClinicInfo = async (clinicId: string): Promise<ClinicInfo | null> => {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .single()
    if (!clinic) return null

    const c = clinic as Clinic
    const { data: hours } = await supabase
      .from("clinic_operating_hours")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("is_open", true)

    const dayIndex = new Date().getDay()
    const todayHours = (hours || []).find(
      (h: { day_of_week: number }) => h.day_of_week === dayIndex
    ) as { open_time?: string; close_time?: string } | undefined

    const operatingHours = todayHours
      ? `${todayHours.open_time?.substring(0, 5) || "?"} — ${todayHours.close_time?.substring(0, 5) || "?"}`
      : "Closed today"

    return {
      name: c.name,
      status: c.status,
      timezone: c.timezone,
      current_time: new Date().toLocaleTimeString(),
      today_date: new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      operating_hours: operatingHours,
    }
  }

  const getStats = async (clinicId: string): Promise<DashboardStats> => {
    const today = new Date().toISOString().split("T")[0] || ""

    const [{ count: patients }, { count: appointments }, { count: todayAppts }, { count: inventory }, { count: staff }] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("appointment_date", today),
      supabase.from("inventory_items").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
    ])

    return {
      total_patients: patients || 0,
      total_appointments: appointments || 0,
      today_appointments: todayAppts || 0,
      total_inventory_items: inventory || 0,
      total_staff: staff || 0,
    }
  }

  const getTodayAppointments = async (clinicId: string): Promise<TodayAppointment[]> => {
    const today = new Date().toISOString().split("T")[0] || ""

    const { data } = await supabase
      .from("appointments")
      .select("*, doctor:doctor_id(id, full_name)")
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today)
      .order("start_time", { ascending: true })

    return (data || []).map((row: Record<string, unknown>) => {
      const doc = row.doctor as { full_name?: string } | undefined
      return {
        id: row.id as string,
        patient_name: row.patient_name as string,
        patient_phone: (row.patient_phone as string) || null,
        patient_id: (row.patient_id as string) || null,
        doctor_name: doc?.full_name || "Unknown",
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        status: (row.status as AppointmentStatus) || "scheduled",
        reason: (row.reason as string) || null,
      }
    })
  }

  const getUpcomingAppointments = async (clinicId: string): Promise<UpcomingAppointment[]> => {
    const today = new Date().toISOString().split("T")[0] || ""

    const { data } = await supabase
      .from("appointments")
      .select("*, doctor:doctor_id(id, full_name)")
      .eq("clinic_id", clinicId)
      .gte("appointment_date", today)
      .not("status", "in", `("cancelled","no_show","completed")`)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(10)

    return (data || []).map((row: Record<string, unknown>) => {
      const doc = row.doctor as { full_name?: string } | undefined
      return {
        id: row.id as string,
        patient_name: row.patient_name as string,
        patient_id: (row.patient_id as string) || null,
        doctor_name: doc?.full_name || "Unknown",
        appointment_date: row.appointment_date as string,
        start_time: row.start_time as string,
        status: (row.status as AppointmentStatus) || "scheduled",
      }
    })
  }

  const getLowStockAlerts = async (clinicId: string): Promise<LowStockAlert[]> => {
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, unit, current_stock, minimum_stock")
      .eq("clinic_id", clinicId)

    return ((data || []) as LowStockAlert[])
      .filter((i) => i.current_stock <= i.minimum_stock)
  }

  const getRecentActivity = async (clinicId: string): Promise<DashboardActivity[]> => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*, users!user_id(full_name)")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(20)

    return (data || []).map((row: Record<string, unknown>) => {
      const user = row.users as { full_name?: string } | undefined
      return {
        id: row.id as string,
        user_name: user?.full_name || "System",
        action: row.action as string,
        entity_type: row.entity_type as string,
        created_at: row.created_at as string,
      }
    })
  }

  const getNotifications = async (clinicId: string): Promise<DashboardNotification[]> => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(5)

    return (data || []) as DashboardNotification[]
  }

  const getTasks = async (clinicId: string): Promise<DashboardTask[]> => {
    const tasks: DashboardTask[] = []

    const today = new Date().toISOString().split("T")[0] || ""

    const { data: inventoryItems } = await supabase
      .from("inventory_items")
      .select("current_stock, minimum_stock")
      .eq("clinic_id", clinicId)

    const lowStockCount = ((inventoryItems || []) as { current_stock: number; minimum_stock: number }[])
      .filter((i) => i.current_stock <= i.minimum_stock).length

    const [{ count: pendingInvites }, { count: upcoming }] = await Promise.all([
      supabase
        .from("staff_invitations")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "pending"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("appointment_date", today)
        .in("status", ["scheduled", "confirmed", "arrived"]),
    ])

    if (lowStockCount > 0) {
      tasks.push({
        id: "low_stock",
        type: "low_stock",
        label: "Low Stock Items",
        description: `${lowStockCount} item${lowStockCount !== 1 ? "s" : ""} below minimum threshold`,
        count: lowStockCount,
        link: "/inventory",
      })
    }

    if (pendingInvites && pendingInvites > 0) {
      tasks.push({
        id: "pending_invitations",
        type: "pending_invitations",
        label: "Pending Invitations",
        description: `${pendingInvites} staff invitation${pendingInvites !== 1 ? "s" : ""} pending`,
        count: pendingInvites,
        link: "/settings/staff",
      })
    }

    if (upcoming && upcoming > 0) {
      tasks.push({
        id: "upcoming_appointments",
        type: "upcoming_appointments",
        label: "Appointments Today",
        description: `${upcoming} appointment${upcoming !== 1 ? "s" : ""} requiring attention`,
        count: upcoming,
        link: "/appointments/today",
      })
    }

    return tasks
  }

  return {
    async getDashboardOverview(clinicId: string): Promise<DashboardOverview> {
      const [clinic, stats, todayAppointments, upcomingAppointments, lowStockAlerts, recentActivity, notifications, tasks] = await Promise.all([
        getClinicInfo(clinicId).catch(() => null),
        getStats(clinicId),
        getTodayAppointments(clinicId),
        getUpcomingAppointments(clinicId),
        getLowStockAlerts(clinicId).catch(() => [] as LowStockAlert[]),
        getRecentActivity(clinicId),
        getNotifications(clinicId),
        getTasks(clinicId),
      ])

      return {
        clinic,
        stats,
        todayAppointments,
        upcomingAppointments,
        lowStockAlerts,
        recentActivity,
        notifications,
        tasks,
      }
    },

    getTodayAppointments,
    getUpcomingAppointments,
    getLowStockAlerts,
    getRecentActivity,
    getNotifications,
    getTasks,
  }
}
