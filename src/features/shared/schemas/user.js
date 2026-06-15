import { z } from "zod";
export const userSchema = z.object({
    full_name: z.string().min(1, "Full name is required").max(200),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional().nullable(),
    avatar_url: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
    clinic_id: z.string().uuid("Invalid clinic ID"),
    status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
});
