import { z } from "zod";
export const reminderSettingsSchema = z.object({
    whatsapp_reminders_enabled: z.boolean(),
    reminder_hours_before: z.number().int().positive("Must be a positive number"),
});
export const templateSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    template_type: z.enum(["appointment_reminder", "appointment_confirmation", "system_notification"]),
    content: z.string().min(1, "Content is required"),
    is_active: z.boolean().default(true),
});
