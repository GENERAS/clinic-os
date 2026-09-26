import { z } from "zod";
import { emailSchema, optionalPhoneSchema } from "@/lib/validation";

export const signupSchema = z.object({
    fullName: z.string().trim().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
    email: emailSchema,
    phone: optionalPhoneSchema,
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(72, "Password must be 72 characters or less"),
});
