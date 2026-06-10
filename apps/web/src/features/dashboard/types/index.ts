import type { AppointmentStatus } from "@/features/appointments/types"

export interface DashboardOverview {
  clinic: ClinicInfo | null
  stats: DashboardStats
  todayAppointments: TodayAppointment[]
  upcomingAppointments: UpcomingAppointment[]
  lowStockAlerts: LowStockAlert[]
  recentActivity: DashboardActivity[]
  notifications: DashboardNotification[]
  tasks: DashboardTask[]
}

export interface ClinicInfo {
  name: string
  status: string
  timezone: string
  current_time: string
  today_date: string
  operating_hours: string
}

export interface DashboardStats {
  total_patients: number
  total_appointments: number
  today_appointments: number
  total_inventory_items: number
  total_staff: number
}

export interface TodayAppointment {
  id: string
  patient_name: string
  patient_phone: string | null
  patient_id: string | null
  doctor_name: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  reason: string | null
}

export interface UpcomingAppointment {
  id: string
  patient_name: string
  patient_id: string | null
  doctor_name: string
  appointment_date: string
  start_time: string
  status: AppointmentStatus
}

export interface LowStockAlert {
  id: string
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
}

export interface DashboardActivity {
  id: string
  user_name: string
  action: string
  entity_type: string
  created_at: string
}

export interface DashboardNotification {
  id: string
  title: string
  message: string | null
  type: "info" | "warning" | "success" | "error"
  is_read: boolean
  created_at: string
}

export interface DashboardTask {
  id: string
  type: "low_stock" | "pending_invitations" | "upcoming_appointments" | "incomplete_setup"
  label: string
  description: string
  count: number
  link: string
}

export type DashboardSection =
  | "today_appointments"
  | "upcoming_appointments"
  | "low_stock_alerts"
  | "recent_activity"
  | "clinic_overview"
  | "my_tasks"
  | "quick_stats"
  | "notifications"

export interface DashboardToggle {
  section: DashboardSection
  title: string
  visible: boolean
}

export type SectionVisibility = Record<DashboardSection, boolean>
