export interface PatientSummary {
  id: string
  full_name: string
  phone: string
  gender: string | null
  total_visits: number
  last_visit_date: string | null
  upcoming_appointment: string | null
  created_at: string
}

export interface PatientSearchResult {
  id: string
  full_name: string
  phone: string
  gender: string | null
}

export interface PatientWithStats {
  id: string
  clinic_id: string
  full_name: string
  phone: string
  email: string | null
  gender: string | null
  date_of_birth: string | null
  age: number | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  total_appointments: number
  last_appointment: { appointment_date: string; status: string } | null
  upcoming_appointment: { appointment_date: string; start_time: string; status: string } | null
}
