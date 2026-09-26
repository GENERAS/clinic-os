import { z } from "zod";
import { emailSchema, requiredUuid, optionalPhoneSchema } from "@/lib/validation";

export const inviteStaffSchema = z.object({
    email: emailSchema,
    role_id: requiredUuid("Role"),
});
export const updateStaffSchema = z.object({
    full_name: z.string().trim().min(1, "Name is required").max(200),
    phone: optionalPhoneSchema,
});
export const changeRoleSchema = z.object({
    role_id: requiredUuid("Role"),
});
export const statusChangeSchema = z.object({
    status: z.enum(["active", "inactive", "suspended"]),
});
