import { z } from "zod"

export const clinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  logo_url: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
})

export type ClinicSchemaType = z.infer<typeof clinicSchema>
