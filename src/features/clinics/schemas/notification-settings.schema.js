import { z } from "zod";
export const notificationSettingsSchema = z.object({
    appointment_reminders_enabled: z.boolean(),
    low_stock_alerts_enabled: z.boolean(),
    system_notifications_enabled: z.boolean(),
});
