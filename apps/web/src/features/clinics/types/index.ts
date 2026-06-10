export interface ClinicProfile {
  name: string
  email: string | null
  phone: string | null
  alternative_phone: string | null
  website: string | null
  description: string | null
  timezone: string
}

export interface ClinicLocation {
  country: string | null
  city: string | null
  address: string | null
}

export interface ClinicOperatingHour {
  id: string
  clinic_id: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
}

export interface ClinicPreference {
  id: string
  clinic_id: string
  currency: string
  date_format: string
  time_format: string
  language: string
}

export interface ClinicNotificationSetting {
  id: string
  clinic_id: string
  appointment_reminders_enabled: boolean
  low_stock_alerts_enabled: boolean
  system_notifications_enabled: boolean
}

export type ClinicSettingsTab = "profile" | "location" | "branding" | "hours" | "preferences" | "notifications"

export const DAY_LABELS: Record<number, string> = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
}
