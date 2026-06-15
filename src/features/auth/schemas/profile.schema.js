import { z } from "zod";
export const profileSchema = z.object({
    full_name: z.string().min(1, "Name is required").max(200),
    phone: z
        .string()
        .max(20, "Phone must be 20 characters or less")
        .regex(/^\+?[\d\s\-()]*$/, "Invalid phone format")
        .optional()
        .or(z.literal("")),
});
export const passwordSchema = z
    .object({
    current_password: z.string().min(6, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
})
    .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});
