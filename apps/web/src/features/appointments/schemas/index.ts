import { z } from "zod"

export const createAppointmentSchema = z.object({
  patient_name: z.string().min(1, "Patient name is required").max(200),
  patient_phone: z.string().optional().nullable(),
  patient_id: z.string().optional().nullable(),
  doctor_id: z.string().uuid("Doctor selection is required").min(1, "Doctor is required"),
  appointment_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (!data.start_time || !data.end_time) return true
    return data.start_time < data.end_time
  },
  { message: "End time must be after start time", path: ["end_time"] }
).refine(
  (data) => {
    if (!data.appointment_date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const appointmentDate = new Date(data.appointment_date + "T00:00:00")
    return appointmentDate >= today
  },
  { message: "Cannot create appointments in the past", path: ["appointment_date"] }
)

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>

export const updateAppointmentSchema = z.object({
  patient_name: z.string().min(1, "Patient name is required").max(200).optional(),
  patient_phone: z.string().optional().nullable(),
  patient_id: z.string().optional().nullable(),
  doctor_id: z.string().uuid("Doctor selection is required").optional(),
  appointment_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type UpdateAppointmentFormValues = z.infer<typeof updateAppointmentSchema>

export const rescheduleAppointmentSchema = z.object({
  appointment_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: "End time must be after start time", path: ["end_time"] }
)

export type RescheduleAppointmentFormValues = z.infer<typeof rescheduleAppointmentSchema>

export const statusChangeSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "arrived", "in_progress", "completed", "cancelled", "no_show"]),
})

export type StatusChangeFormValues = z.infer<typeof statusChangeSchema>

export const appointmentNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(2000),
})

export type AppointmentNoteFormValues = z.infer<typeof appointmentNoteSchema>
