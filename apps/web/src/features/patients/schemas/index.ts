import { z } from "zod"

export const createPatientSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  gender: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>

export const updatePatientSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200).optional(),
  phone: z.string().min(1, "Phone is required").optional(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  gender: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type UpdatePatientFormValues = z.infer<typeof updatePatientSchema>

export const patientNoteSchema = z.object({
  content: z.string().min(1, "Note is required").max(2000),
})

export type PatientNoteFormValues = z.infer<typeof patientNoteSchema>
