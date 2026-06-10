import { z } from "zod"

export const inviteStaffSchema = z.object({
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  role_id: z.string().uuid("Role selection is required").min(1, "Role is required"),
})

export type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>

export const updateStaffSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  phone: z.string().nullable().or(z.literal("")),
})

export type UpdateStaffFormValues = z.infer<typeof updateStaffSchema>

export const changeRoleSchema = z.object({
  role_id: z.string().uuid("Role is required"),
})

export type ChangeRoleFormValues = z.infer<typeof changeRoleSchema>

export const statusChangeSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
})

export type StatusChangeFormValues = z.infer<typeof statusChangeSchema>
