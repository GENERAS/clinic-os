// Generated database types for ClinicOS
// Based on supabase/migrations/00001_initial_schema.sql and 00002_clinic_settings.sql

// ********************************************
// ENUMS & HELPERS
// ********************************************

export type ClinicStatus = "active" | "inactive" | "suspended"
export type UserStatus = "active" | "inactive" | "suspended"
export type NotificationType = "info" | "warning" | "success" | "error"

// ********************************************
// TABLE: clinics
// ********************************************

export interface Clinic {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  alternative_phone: string | null
  website: string | null
  description: string | null
  country: string | null
  city: string | null
  address: string | null
  logo_url: string | null
  timezone: string
  status: ClinicStatus
  created_at: string
  updated_at: string
}

export interface ClinicInsert {
  id?: string
  name: string
  slug: string
  phone?: string | null
  email?: string | null
  alternative_phone?: string | null
  website?: string | null
  description?: string | null
  country?: string | null
  city?: string | null
  address?: string | null
  logo_url?: string | null
  timezone?: string
  status?: ClinicStatus
  created_at?: string
  updated_at?: string
}

export interface ClinicUpdate {
  name?: string
  slug?: string
  phone?: string | null
  email?: string | null
  alternative_phone?: string | null
  website?: string | null
  description?: string | null
  country?: string | null
  city?: string | null
  address?: string | null
  logo_url?: string | null
  timezone?: string
  status?: ClinicStatus
  updated_at?: string
}

// ********************************************
// TABLE: users
// ********************************************

export interface User {
  id: string
  clinic_id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  status: UserStatus
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id?: string
  clinic_id: string
  full_name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  status?: UserStatus
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  full_name?: string
  email?: string
  phone?: string | null
  avatar_url?: string | null
  status?: UserStatus
  last_login_at?: string | null
  updated_at?: string
}

// ********************************************
// TABLE: roles
// ********************************************

export interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface RoleInsert {
  id?: string
  name: string
  description?: string | null
  created_at?: string
}

export interface RoleUpdate {
  name?: string
  description?: string | null
}

// ********************************************
// TABLE: permissions
// ********************************************

export interface Permission {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface PermissionInsert {
  id?: string
  name: string
  description?: string | null
  created_at?: string
}

export interface PermissionUpdate {
  name?: string
  description?: string | null
}

// ********************************************
// TABLE: user_roles (many-to-many)
// ********************************************

export interface UserRole {
  id: string
  user_id: string
  role_id: string
}

export interface UserRoleInsert {
  id?: string
  user_id: string
  role_id: string
}

// ********************************************
// TABLE: role_permissions (many-to-many)
// ********************************************

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
}

export interface RolePermissionInsert {
  id?: string
  role_id: string
  permission_id: string
}

// ********************************************
// TABLE: audit_logs
// ********************************************

export interface AuditLog {
  id: string
  clinic_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuditLogInsert {
  id?: string
  clinic_id: string
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  ip_address?: string | null
  created_at?: string
}

// ********************************************
// TABLE: notifications
// ********************************************

export interface Notification {
  id: string
  clinic_id: string
  user_id: string | null
  title: string
  message: string | null
  type: NotificationType
  is_read: boolean
  created_at: string
}

export interface NotificationInsert {
  id?: string
  clinic_id: string
  user_id?: string | null
  title: string
  message?: string | null
  type?: NotificationType
  is_read?: boolean
  created_at?: string
}

export interface NotificationUpdate {
  is_read?: boolean
}

// ********************************************
// TABLE: clinic_operating_hours
// ********************************************

export interface ClinicOperatingHour {
  id: string
  clinic_id: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  created_at: string
}

export interface ClinicOperatingHourInsert {
  id?: string
  clinic_id: string
  day_of_week: number
  is_open?: boolean
  open_time?: string
  close_time?: string
  created_at?: string
}

export interface ClinicOperatingHourUpdate {
  is_open?: boolean
  open_time?: string
  close_time?: string
}

// ********************************************
// TABLE: clinic_preferences
// ********************************************

export interface ClinicPreference {
  id: string
  clinic_id: string
  currency: string
  date_format: string
  time_format: string
  language: string
  created_at: string
  updated_at: string
}

export interface ClinicPreferenceInsert {
  id?: string
  clinic_id: string
  currency?: string
  date_format?: string
  time_format?: string
  language?: string
  created_at?: string
  updated_at?: string
}

export interface ClinicPreferenceUpdate {
  currency?: string
  date_format?: string
  time_format?: string
  language?: string
  updated_at?: string
}

// ********************************************
// TABLE: clinic_notification_settings
// ********************************************

export interface ClinicNotificationSetting {
  id: string
  clinic_id: string
  appointment_reminders_enabled: boolean
  low_stock_alerts_enabled: boolean
  system_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ClinicNotificationSettingInsert {
  id?: string
  clinic_id: string
  appointment_reminders_enabled?: boolean
  low_stock_alerts_enabled?: boolean
  system_notifications_enabled?: boolean
  created_at?: string
  updated_at?: string
}

export interface ClinicNotificationSettingUpdate {
  appointment_reminders_enabled?: boolean
  low_stock_alerts_enabled?: boolean
  system_notifications_enabled?: boolean
  updated_at?: string
}

// ********************************************
// TABLE: staff_invitations
// ********************************************

export interface StaffInvitation {
  id: string
  clinic_id: string
  email: string
  role_id: string
  token: string
  status: "pending" | "accepted" | "expired" | "cancelled"
  expires_at: string
  created_at: string
  accepted_at: string | null
}

export interface StaffInvitationInsert {
  id?: string
  clinic_id: string
  email: string
  role_id: string
  token: string
  status?: "pending" | "accepted" | "expired" | "cancelled"
  expires_at: string
  created_at?: string
  accepted_at?: string | null
}

// ********************************************
// AGGREGATED TYPES
// ********************************************

export interface UserWithRoles extends User {
  roles: Role[]
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

// ********************************************
// TABLE: appointments
// ********************************************

export type AppointmentStatusDb = "scheduled" | "confirmed" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_show"

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
  status: AppointmentStatusDb
  created_at: string
  updated_at: string
}

export interface AppointmentInsert {
  id?: string
  clinic_id: string
  patient_name: string
  patient_phone?: string | null
  patient_id?: string | null
  doctor_id: string
  created_by: string
  appointment_date: string
  start_time: string
  end_time: string
  reason?: string | null
  notes?: string | null
  status?: AppointmentStatusDb
  created_at?: string
  updated_at?: string
}

export interface AppointmentUpdate {
  patient_name?: string
  patient_phone?: string | null
  patient_id?: string | null
  doctor_id?: string
  appointment_date?: string
  start_time?: string
  end_time?: string
  reason?: string | null
  notes?: string | null
  status?: AppointmentStatusDb
  updated_at?: string
}

// ********************************************
// TABLE: appointment_status_history
// ********************************************

export interface AppointmentStatusHistory {
  id: string
  appointment_id: string
  old_status: string | null
  new_status: string
  changed_by: string
  created_at: string
}

export interface AppointmentStatusHistoryInsert {
  id?: string
  appointment_id: string
  old_status?: string | null
  new_status: string
  changed_by: string
  created_at?: string
}

// ********************************************
// TABLE: appointment_notes
// ********************************************

export interface AppointmentNote {
  id: string
  appointment_id: string
  author_id: string
  content: string
  created_at: string
}

export interface AppointmentNoteInsert {
  id?: string
  appointment_id: string
  author_id: string
  content: string
  created_at?: string
}

// ********************************************
// TABLE: patients
// ********************************************

export interface Patient {
  id: string
  clinic_id: string
  full_name: string
  phone: string
  email: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface PatientInsert {
  id?: string
  clinic_id: string
  full_name: string
  phone: string
  email?: string | null
  gender?: string | null
  date_of_birth?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface PatientUpdate {
  full_name?: string
  phone?: string
  email?: string | null
  gender?: string | null
  date_of_birth?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  updated_at?: string
}

// ********************************************
// TABLE: patient_notes
// ********************************************

export interface PatientNote {
  id: string
  clinic_id: string
  patient_id: string
  author_id: string
  content: string
  created_at: string
}

export interface PatientNoteInsert {
  id?: string
  clinic_id: string
  patient_id: string
  author_id: string
  content: string
  created_at?: string
}

// ********************************************
// TABLE: inventory_categories
// ********************************************

export interface InventoryCategory {
  id: string
  clinic_id: string
  name: string
  description: string | null
  created_at: string
}

export interface InventoryCategoryInsert {
  id?: string
  clinic_id: string
  name: string
  description?: string | null
  created_at?: string
}

export interface InventoryCategoryUpdate {
  name?: string
  description?: string | null
}

// ********************************************
// TABLE: inventory_items
// ********************************************

export interface InventoryItem {
  id: string
  clinic_id: string
  category_id: string | null
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryItemInsert {
  id?: string
  clinic_id: string
  category_id?: string | null
  name: string
  unit: string
  current_stock?: number
  minimum_stock?: number
  description?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface InventoryItemUpdate {
  name?: string
  category_id?: string | null
  unit?: string
  minimum_stock?: number
  description?: string | null
  updated_at?: string
}

// ********************************************
// TABLE: inventory_transactions
// ********************************************

export type TransactionType = "stock_in" | "stock_out" | "adjustment" | "expired"

export interface InventoryTransaction {
  id: string
  clinic_id: string
  inventory_item_id: string
  type: TransactionType
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  performed_by: string
  created_at: string
}

export interface InventoryTransactionInsert {
  id?: string
  clinic_id: string
  inventory_item_id: string
  type: TransactionType
  quantity: number
  previous_stock: number
  new_stock: number
  reason?: string | null
  performed_by: string
  created_at?: string
}

export type Tables = {
  clinics: Clinic
  users: User
  roles: Role
  permissions: Permission
  user_roles: UserRole
  role_permissions: RolePermission
  audit_logs: AuditLog
  notifications: Notification
  clinic_operating_hours: ClinicOperatingHour
  clinic_preferences: ClinicPreference
  clinic_notification_settings: ClinicNotificationSetting
  staff_invitations: StaffInvitation
  appointments: Appointment
  appointment_status_history: AppointmentStatusHistory
  appointment_notes: AppointmentNote
  patients: Patient
  patient_notes: PatientNote
  inventory_categories: InventoryCategory
  inventory_items: InventoryItem
  inventory_transactions: InventoryTransaction
}

export type TablesInsert = {
  clinics: ClinicInsert
  users: UserInsert
  roles: RoleInsert
  permissions: PermissionInsert
  user_roles: UserRoleInsert
  role_permissions: RolePermissionInsert
  audit_logs: AuditLogInsert
  notifications: NotificationInsert
  clinic_operating_hours: ClinicOperatingHourInsert
  clinic_preferences: ClinicPreferenceInsert
  clinic_notification_settings: ClinicNotificationSettingInsert
  staff_invitations: StaffInvitationInsert
  appointments: AppointmentInsert
  appointment_status_history: AppointmentStatusHistoryInsert
  appointment_notes: AppointmentNoteInsert
  patients: PatientInsert
  patient_notes: PatientNoteInsert
  inventory_categories: InventoryCategoryInsert
  inventory_items: InventoryItemInsert
  inventory_transactions: InventoryTransactionInsert
}

export type TablesUpdate = {
  clinics: ClinicUpdate
  users: UserUpdate
  roles: RoleUpdate
  permissions: PermissionUpdate
  notifications: NotificationUpdate
  clinic_operating_hours: ClinicOperatingHourUpdate
  inventory_categories: InventoryCategoryUpdate
  inventory_items: InventoryItemUpdate
  clinic_preferences: ClinicPreferenceUpdate
  clinic_notification_settings: ClinicNotificationSettingUpdate
}
