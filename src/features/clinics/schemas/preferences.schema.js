import { z } from "zod";
export const preferencesSchema = z.object({
    currency: z.string().min(1, "Currency is required").max(10),
    date_format: z.string().min(1, "Date format is required"),
    time_format: z.enum(["12h", "24h"]),
    language: z.string().min(1, "Language is required").max(50),
});
