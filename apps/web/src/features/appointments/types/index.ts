export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"

export interface Appointment {
  id: string
  clinic_id: string
  patient_name: string
  patient_phone: string | null
  patient_id: string | null
  doctor_id: string
  created_by: string
  appointment_date: string
  start_time: string
  end_time: string
  reason: string | null
  notes: string | null
  status: AppointmentStatus
  created_at: string
  updated_at: string
}

export interface AppointmentWithRelations extends Appointment {
  doctor: { id: string; full_name: string; avatar_url: string | null }
  creator: { id: string; full_name: string }
  status_history: AppointmentStatusHistory[]
  appointmentNotes: AppointmentNoteWithAuthor[]
}

export interface AppointmentStatusHistory {
  id: string
  appointment_id: string
  old_status: string | null
  new_status: string
  changed_by: string
  created_at: string
}

export interface AppointmentNote {
  id: string
  appointment_id: string
  author_id: string
  content: string
  created_at: string
}

export interface AppointmentNoteWithAuthor extends AppointmentNote {
  author: { full_name: string }
}

export interface AppointmentFilters {
  search: string
  doctor_id: string
  status: string
  date_from: string
  date_to: string
}

export interface AppointmentCalendarDay {
  date: Date
  appointments: AppointmentWithRelations[]
}

export interface AppointmentCalendarWeek {
  days: AppointmentCalendarDay[]
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
}

export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["arrived", "cancelled", "no_show"],
  arrived: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
}
