import { z } from "zod";
export const clinicProfileSchema = z.object({
    name: z.string().min(1, "Clinic name is required").max(200),
    email: z.string().email("Invalid email").nullable().or(z.literal("")),
    phone: z.string().nullable().or(z.literal("")),
    alternative_phone: z.string().nullable().or(z.literal("")),
    website: z.string().url("Invalid URL").nullable().or(z.literal("")),
    description: z.string().max(1000).nullable().or(z.literal("")),
    timezone: z.string().min(1, "Timezone is required"),
});
export const clinicLocationSchema = z.object({
    country: z.string().max(100).nullable().or(z.literal("")),
    city: z.string().max(100).nullable().or(z.literal("")),
    address: z.string().max(500).nullable().or(z.literal("")),
});
