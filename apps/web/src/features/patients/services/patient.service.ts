import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import type { Patient, PatientInsert, PatientUpdate, PatientNote, PatientNoteInsert } from "@/types/database"
import type { PatientSummary, PatientSearchResult, PatientWithStats } from "../types"

export function getPatientService() {
  const supabase = createClient()
  const audit = getAuditService()

  const calcAge = (dob: string): number => {
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  return {
    async createPatient(clinicId: string, values: Omit<PatientInsert, "clinic_id" | "created_by">, userId: string): Promise<Patient> {
      const { data: existing } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", clinicId)
        .eq("phone", values.phone)
        .maybeSingle()

      if (existing) {
        throw new Error(`PATIENT_EXISTS:${existing.id}:${existing.full_name}`)
      }

      const { data, error } = await supabase
        .from("patients")
        .insert({
          ...values,
          clinic_id: clinicId,
          created_by: userId,
        } as PatientInsert)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "patient created",
        entity_type: "patients",
        entity_id: data.id,
        new_value: { full_name: values.full_name, phone: values.phone },
      }).catch(() => {})

      return data as Patient
    },

    async getPatients(clinicId: string, search?: string, options?: { page?: number; pageSize?: number }): Promise<{ data: PatientSummary[]; total: number }> {
      const page = options?.page || 0
      const pageSize = options?.pageSize || 20

      const from = page * pageSize
      const to = from + pageSize - 1

      const baseQuery = supabase
        .from("patients")
        .select(`
          id, full_name, phone, gender, created_at,
          appointments!left(appointment_date, status)
        `, { count: "exact" })
        .eq("clinic_id", clinicId)

      if (search) {
        const q = search.trim()
        if (q) {
          baseQuery.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        }
      }

      const { data, error, count } = await baseQuery
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error

      const patients: PatientSummary[] = (data || []).map((row: Record<string, unknown>) => {
        const appointments = row.appointments as { appointment_date: string; status: string }[] | undefined
        const sorted = [...(appointments || [])].sort(
          (a, b) => (a.appointment_date < b.appointment_date ? 1 : -1)
        )
        const completed = sorted.filter((a) => a.status !== "cancelled" && a.status !== "no_show")
        const today = new Date().toISOString().split("T")[0] || ""
        const upcoming = sorted.find((a) => {
          const dateStr = a.appointment_date
          return dateStr >= today && a.status !== "cancelled" && a.status !== "no_show" && a.status !== "completed"
        })

        return {
          id: row.id as string,
          full_name: row.full_name as string,
          phone: row.phone as string,
          gender: row.gender as string | null,
          total_visits: completed.length,
          last_visit_date: completed[0]?.appointment_date ?? null,
          upcoming_appointment: upcoming?.appointment_date || null,
          created_at: row.created_at as string,
        }
      })

      return { data: patients, total: count || 0 }
    },

    async searchPatients(clinicId: string, query: string): Promise<PatientSearchResult[]> {
      if (!query || query.trim().length < 2) return []

      const q = query.trim()
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone, gender")
        .eq("clinic_id", clinicId)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10)

      if (error) throw error
      return (data || []) as PatientSearchResult[]
    },

    async getPatientById(clinicId: string, patientId: string): Promise<PatientWithStats | null> {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .eq("clinic_id", clinicId)
        .single()
      if (error) return null

      const { data: appointments } = await supabase
        .from("appointments")
        .select("appointment_date, status, start_time")
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .limit(50)

      const total = appointments?.length || 0
      const sorted = [...(appointments || [])].sort((a, b) =>
        a.appointment_date < b.appointment_date ? 1 : -1
      )
      const completed = sorted.filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show" && a.status === "completed"
      )
      const today = new Date().toISOString().split("T")[0] || ""
      const upcoming = sorted.find(
        (a) => a.appointment_date >= today && a.status !== "cancelled" && a.status !== "no_show" && a.status !== "completed"
      )

      const patient = data as Patient
      return {
        ...patient,
        age: patient.date_of_birth ? calcAge(patient.date_of_birth) : null,
        total_appointments: total,
        last_appointment: completed[0]
          ? { appointment_date: completed[0].appointment_date, status: completed[0].status }
          : null,
        upcoming_appointment: upcoming
          ? { appointment_date: upcoming.appointment_date, start_time: upcoming.start_time, status: upcoming.status }
          : null,
      }
    },

    async updatePatient(clinicId: string, patientId: string, values: PatientUpdate, userId: string): Promise<Patient> {
      if (values.phone) {
        const { data: existing } = await supabase
          .from("patients")
          .select("id, full_name")
          .eq("clinic_id", clinicId)
          .eq("phone", values.phone)
          .neq("id", patientId)
          .maybeSingle()

        if (existing) {
          throw new Error(`PATIENT_EXISTS:${existing.id}:${existing.full_name}`)
        }
      }

      const { data, error } = await supabase
        .from("patients")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", patientId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "patient updated",
        entity_type: "patients",
        entity_id: patientId,
        new_value: values as Record<string, unknown>,
      }).catch(() => {})

      return data as Patient
    },

    async getPatientAppointments(clinicId: string, patientId: string, page?: number, pageSize?: number): Promise<{ data: Record<string, unknown>[]; total: number }> {
      const p = page || 0
      const ps = pageSize || 20
      const from = p * ps
      const to = from + ps - 1

      const { data, error, count } = await supabase
        .from("appointments")
        .select("*, doctor:doctor_id(id, full_name)", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data: data || [], total: count || 0 }
    },

    async addPatientNote(clinicId: string, patientId: string, content: string, userId: string): Promise<PatientNote> {
      const { data, error } = await supabase
        .from("patient_notes")
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          author_id: userId,
          content,
        } as PatientNoteInsert)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "patient note added",
        entity_type: "patient_notes",
        entity_id: data.id,
        new_value: { patient_id: patientId },
      }).catch(() => {})

      return data as PatientNote
    },

    async getPatientNotes(clinicId: string, patientId: string): Promise<(PatientNote & { author_name: string })[]> {
      const { data, error } = await supabase
        .from("patient_notes")
        .select("*, users!author_id(full_name)")
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        clinic_id: row.clinic_id as string,
        patient_id: row.patient_id as string,
        author_id: row.author_id as string,
        content: row.content as string,
        created_at: row.created_at as string,
        author_name: (row.users as { full_name?: string })?.full_name || "Unknown",
      }))
    },
  }
}
