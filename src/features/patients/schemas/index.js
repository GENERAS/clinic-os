import { z } from "zod";
import { phoneSchema, optionalPhoneSchema, optionalEmailSchema, nationalIdSchema, pastOrTodayDateSchema } from "@/lib/validation";

export const createPatientSchema = z.object({
    full_name: z.string().trim().min(1, "Name is required").max(200),
    phone: phoneSchema,
    email: optionalEmailSchema,
    gender: z.string().optional().nullable(),
    date_of_birth: pastOrTodayDateSchema("Date of birth").optional().nullable().or(z.literal("")),
    address: z.string().optional().nullable(),
    national_id: nationalIdSchema,
    emergency_contact_name: z.string().trim().max(200, "Name is too long").optional().nullable(),
    emergency_contact_phone: optionalPhoneSchema,
    notes: z.string().trim().max(2000, "Notes must be 2000 characters or less").optional().nullable(),
});
export const updatePatientSchema = z.object({
    full_name: z.string().trim().min(1, "Name is required").max(200).optional(),
    phone: z.string().trim().min(1, "Phone is required").optional(),
    email: optionalEmailSchema,
    gender: z.string().optional().nullable(),
    date_of_birth: pastOrTodayDateSchema("Date of birth").optional().nullable().or(z.literal("")),
    address: z.string().optional().nullable(),
    national_id: nationalIdSchema,
    emergency_contact_name: z.string().trim().max(200, "Name is too long").optional().nullable(),
    emergency_contact_phone: optionalPhoneSchema,
    notes: z.string().trim().max(2000, "Notes must be 2000 characters or less").optional().nullable(),
});
export const patientNoteSchema = z.object({
    content: z.string().min(1, "Note is required").max(2000),
});
