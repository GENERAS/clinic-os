import { z } from "zod";
import { requiredUuid, optionalPhoneSchema, notInPastRefinement, endAfterStartRefinement } from "@/lib/validation";

const timesRefinement = endAfterStartRefinement("start_time", "end_time");

export const createAppointmentSchema = z.object({
    patient_name: z.string().trim().min(1, "Patient name is required").max(200),
    patient_phone: optionalPhoneSchema,
    patient_id: z.string().optional().nullable(),
    doctor_id: requiredUuid("Doctor"),
    appointment_date: z.string().min(1, "Date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
}).refine(timesRefinement.refine, { message: timesRefinement.message, path: timesRefinement.path })
  .refine(notInPastRefinement("appointment_date", "Cannot create appointments in the past").refine, {
      message: "Cannot create appointments in the past",
      path: ["appointment_date"],
  });

export const updateAppointmentSchema = z.object({
    patient_name: z.string().trim().min(1, "Patient name is required").max(200).optional(),
    patient_phone: optionalPhoneSchema,
    patient_id: z.string().optional().nullable(),
    doctor_id: z.string().trim().uuid("Doctor is invalid").optional(),
    appointment_date: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
}).refine(timesRefinement.refine, { message: timesRefinement.message, path: timesRefinement.path });
export const rescheduleAppointmentSchema = z.object({
    appointment_date: z.string().min(1, "Date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
}).refine(timesRefinement.refine, { message: timesRefinement.message, path: timesRefinement.path });
export const statusChangeSchema = z.object({
    status: z.enum(["scheduled", "confirmed", "arrived", "in_progress", "completed", "cancelled", "no_show"]),
});
export const appointmentNoteSchema = z.object({
    content: z.string().min(1, "Note content is required").max(2000),
});
