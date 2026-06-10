import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import type { Appointment, AppointmentInsert, AppointmentUpdate, AppointmentStatusHistory, AppointmentNote, AppointmentNoteInsert } from "@/types/database"
import type { AppointmentWithRelations, AppointmentStatus, AppointmentStatusHistory as AppointmentStatusHistoryType, AppointmentNoteWithAuthor, AppointmentFilters } from "../types"
import { APPOINTMENT_STATUS_TRANSITIONS } from "../types"

export function getAppointmentService() {
  const supabase = createClient()
  const audit = getAuditService()

  const mapAppointment = (row: Record<string, unknown>): Appointment => ({
    id: row.id as string,
    clinic_id: row.clinic_id as string,
    patient_name: row.patient_name as string,
    patient_phone: row.patient_phone as string | null,
    patient_id: row.patient_id as string | null,
    doctor_id: row.doctor_id as string,
    created_by: row.created_by as string,
    appointment_date: row.appointment_date as string,
    start_time: row.start_time as string,
    end_time: row.end_time as string,
    reason: row.reason as string | null,
    notes: row.notes as string | null,
    status: row.status as AppointmentStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  })

  const validateTransition = (currentStatus: AppointmentStatus, newStatus: AppointmentStatus): void => {
    const allowed = APPOINTMENT_STATUS_TRANSITIONS[currentStatus]
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from "${currentStatus}" to "${newStatus}"`)
    }
  }

  const checkConflict = async (
    clinicId: string,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<void> => {
    let query = supabase
      .from("appointments")
      .select("id, start_time, end_time, patient_name")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .eq("appointment_date", date)
      .not("status", "in", `("cancelled","no_show")`)

    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId)
    }

    const { data: existing } = await query

    if (existing) {
      const conflict = existing.find((a: Record<string, unknown>) => {
        const existingStart = a.start_time as string
        const existingEnd = a.end_time as string
        return startTime < existingEnd && endTime > existingStart
      })

      if (conflict) {
        throw new Error(
          `Doctor already has an appointment with ${conflict.patient_name} at ${conflict.start_time?.substring(0, 5)}-${conflict.end_time?.substring(0, 5)} on this date`
        )
      }
    }
  }

  const logStatusChange = async (appointmentId: string, oldStatus: string | null, newStatus: string, changedBy: string): Promise<void> => {
    const { error } = await supabase
      .from("appointment_status_history")
      .insert({
        appointment_id: appointmentId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
      })
    if (error) throw error
  }

  return {
    async createAppointment(
      clinicId: string,
      values: Omit<AppointmentInsert, "clinic_id" | "created_by">,
      userId: string
    ): Promise<Appointment> {
      await checkConflict(clinicId, values.doctor_id, values.appointment_date, values.start_time, values.end_time)

      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...values, clinic_id: clinicId, created_by: userId } as AppointmentInsert)
        .select()
        .single()
      if (error) throw error

      await logStatusChange(data.id, null, data.status, userId)

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment created",
        entity_type: "appointments",
        entity_id: data.id,
        new_value: { patient_name: values.patient_name, doctor_id: values.doctor_id, date: values.appointment_date, start_time: values.start_time, end_time: values.end_time },
      }).catch(() => {})

      return mapAppointment(data)
    },

    async updateAppointment(
      clinicId: string,
      appointmentId: string,
      values: AppointmentUpdate,
      userId: string
    ): Promise<Appointment> {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single()
      if (!current) throw new Error("Appointment not found")

      const date = values.appointment_date || current.appointment_date
      const startTime = values.start_time || current.start_time
      const endTime = values.end_time || current.end_time
      const doctorId = values.doctor_id || current.doctor_id

      if (values.doctor_id || values.appointment_date || values.start_time || values.end_time) {
        await checkConflict(clinicId, doctorId, date, startTime, endTime, appointmentId)
      }

      const { data, error } = await supabase
        .from("appointments")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment updated",
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: {
          patient_name: current.patient_name,
          doctor_id: current.doctor_id,
          date: current.appointment_date,
          start_time: current.start_time,
          end_time: current.end_time,
        } as Record<string, unknown>,
        new_value: values as Record<string, unknown>,
      }).catch(() => {})

      return mapAppointment(data)
    },

    async cancelAppointment(
      clinicId: string,
      appointmentId: string,
      userId: string
    ): Promise<Appointment> {
      return this.changeStatus(clinicId, appointmentId, "cancelled", userId)
    },

    async rescheduleAppointment(
      clinicId: string,
      appointmentId: string,
      values: { appointment_date: string; start_time: string; end_time: string },
      userId: string
    ): Promise<Appointment> {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single()
      if (!current) throw new Error("Appointment not found")

      await checkConflict(clinicId, current.doctor_id, values.appointment_date, values.start_time, values.end_time, appointmentId)

      const { data, error } = await supabase
        .from("appointments")
        .update({
          appointment_date: values.appointment_date,
          start_time: values.start_time,
          end_time: values.end_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment rescheduled",
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: {
          date: current.appointment_date,
          start_time: current.start_time,
          end_time: current.end_time,
        },
        new_value: values,
      }).catch(() => {})

      return mapAppointment(data)
    },

    async changeStatus(
      clinicId: string,
      appointmentId: string,
      newStatus: AppointmentStatus,
      userId: string
    ): Promise<Appointment> {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single()
      if (!current) throw new Error("Appointment not found")

      validateTransition(current.status as AppointmentStatus, newStatus)

      const { data, error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      await logStatusChange(appointmentId, current.status, newStatus, userId)

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: `appointment ${newStatus}`,
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: { status: current.status },
        new_value: { status: newStatus },
      }).catch(() => {})

      return mapAppointment(data)
    },

    async getAppointment(
      clinicId: string,
      appointmentId: string
    ): Promise<AppointmentWithRelations | null> {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          doctor:doctor_id(id, full_name, avatar_url),
          creator:created_by(id, full_name)
        `)
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single()
      if (error) return null

      const { data: statusHistory } = await supabase
        .from("appointment_status_history")
        .select("*, users!changed_by(full_name)")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true })

      const { data: notes } = await supabase
        .from("appointment_notes")
        .select("*, author:author_id(full_name)")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })

      return {
        ...mapAppointment(data),
        doctor: data.doctor as { id: string; full_name: string; avatar_url: string | null },
        creator: data.creator as { id: string; full_name: string },
        status_history: (statusHistory || []) as unknown as AppointmentStatusHistoryType[],
        appointmentNotes: (notes || []) as unknown as AppointmentNoteWithAuthor[],
      }
    },

    async getAppointments(
      clinicId: string,
      filters?: Partial<AppointmentFilters>,
      options?: { page?: number; pageSize?: number; sortField?: string; sortOrder?: "asc" | "desc" }
    ): Promise<{ data: AppointmentWithRelations[]; total: number }> {
      const page = options?.page || 0
      const pageSize = options?.pageSize || 20
      const sortField = options?.sortField || "appointment_date"
      const sortOrder = options?.sortOrder || "desc"

      let query = supabase
        .from("appointments")
        .select("*, doctor:doctor_id(id, full_name, avatar_url), creator:created_by(id, full_name)", { count: "exact" })
        .eq("clinic_id", clinicId)

      if (filters?.search) {
        const q = filters.search
        query = query.or(`patient_name.ilike.%${q}%,patient_phone.ilike.%${q}%`)
      }

      if (filters?.doctor_id) {
        query = query.eq("doctor_id", filters.doctor_id)
      }

      if (filters?.status) {
        query = query.eq("status", filters.status)
      }

      if (filters?.date_from) {
        query = query.gte("appointment_date", filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte("appointment_date", filters.date_to)
      }

      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order(sortField, { ascending: sortOrder === "asc" })
        .range(from, to)

      if (error) throw error

      return {
        data: (data || []).map((row: Record<string, unknown>) => ({
          ...mapAppointment(row),
          doctor: row.doctor as { id: string; full_name: string; avatar_url: string | null },
          creator: row.creator as { id: string; full_name: string },
          status_history: [],
          appointmentNotes: [],
        })),
        total: count || 0,
      }
    },

    async getTodayAppointments(
      clinicId: string
    ): Promise<AppointmentWithRelations[]> {
      const today = new Date().toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctor:doctor_id(id, full_name, avatar_url), creator:created_by(id, full_name)")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        ...mapAppointment(row),
        doctor: row.doctor as { id: string; full_name: string; avatar_url: string | null },
        creator: row.creator as { id: string; full_name: string },
        status_history: [],
        appointmentNotes: [],
      }))
    },

    async getCalendarAppointments(
      clinicId: string,
      dateFrom: string,
      dateTo: string
    ): Promise<AppointmentWithRelations[]> {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctor:doctor_id(id, full_name, avatar_url), creator:created_by(id, full_name)")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo)
        .not("status", "in", `("cancelled","no_show")`)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        ...mapAppointment(row),
        doctor: row.doctor as { id: string; full_name: string; avatar_url: string | null },
        creator: row.creator as { id: string; full_name: string },
        status_history: [],
        appointmentNotes: [],
      }))
    },

    async addNote(
      clinicId: string,
      appointmentId: string,
      content: string,
      userId: string
    ): Promise<AppointmentNoteWithAuthor> {
      const { data, error } = await supabase
        .from("appointment_notes")
        .insert({
          appointment_id: appointmentId,
          author_id: userId,
          content,
        } as AppointmentNoteInsert)
        .select("*, author:author_id(full_name)")
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "note added",
        entity_type: "appointments",
        entity_id: appointmentId,
        new_value: { note_id: data.id },
      }).catch(() => {})

      return data as unknown as AppointmentNoteWithAuthor
    },

    async getStatusHistory(
      appointmentId: string
    ): Promise<(AppointmentStatusHistoryType & { changed_by_name?: string })[]> {
      const { data, error } = await supabase
        .from("appointment_status_history")
        .select("*, users!changed_by(full_name)")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        appointment_id: row.appointment_id as string,
        old_status: row.old_status as string | null,
        new_status: row.new_status as string,
        changed_by: row.changed_by as string,
        created_at: row.created_at as string,
        changed_by_name: (row.users as { full_name?: string } | undefined)?.full_name || "Unknown",
      }))
    },

    async getDoctors(clinicId: string): Promise<{ id: string; full_name: string }[]> {
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "Doctor")
        .single()

      if (!roleData) return []

      const { data } = await supabase
        .from("user_roles")
        .select("users(id, full_name)")
        .eq("role_id", roleData.id)
        .in("users.status", ["active"])

      return (data || []).map((r: Record<string, unknown>) => {
        const user = r.users as { id: string; full_name: string }
        return { id: user.id, full_name: user.full_name }
      })
    },
  }
}
