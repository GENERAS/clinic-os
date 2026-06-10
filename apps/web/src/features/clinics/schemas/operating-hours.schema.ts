import { z } from "zod"

export const daySchema = z
  .object({
    day_of_week: z.number().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string(),
    close_time: z.string(),
  })
  .refine(
    (data) => {
      if (!data.is_open) return true
      return data.close_time > data.open_time
    },
    {
      message: "Closing time must be after opening time",
      path: ["close_time"],
    }
  )

export const operatingHoursSchema = z.object({
  hours: z.array(daySchema),
})

export type OperatingHoursFormValues = z.infer<typeof operatingHoursSchema>
export type DayFormValues = z.infer<typeof daySchema>
