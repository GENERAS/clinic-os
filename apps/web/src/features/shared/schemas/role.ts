import { z } from "zod"

export const roleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().optional().nullable(),
})

export type RoleSchemaType = z.infer<typeof roleSchema>
