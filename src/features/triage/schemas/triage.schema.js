import { z } from "zod";
import { vitalSignSchema, computeBmi, VITAL_RANGES } from "@/lib/validation";

const vitalKeys = Object.keys(VITAL_RANGES);

export const triageSchema = z
    .object({
        systolic_bp: vitalSignSchema("systolic_bp"),
        diastolic_bp: vitalSignSchema("diastolic_bp"),
        heart_rate: vitalSignSchema("heart_rate"),
        temperature: vitalSignSchema("temperature"),
        respiratory_rate: vitalSignSchema("respiratory_rate"),
        oxygen_saturation: vitalSignSchema("oxygen_saturation"),
        weight: vitalSignSchema("weight"),
        height: vitalSignSchema("height"),
        chief_complaint: z.string().trim().max(2000, "Chief complaint is too long").optional().or(z.literal("")),
        urgency_level: z.enum(["emergency", "urgent", "routine", "non_urgent"]),
        allergies: z.string().trim().max(2000, "Allergies must be 2000 characters or less").optional().or(z.literal("")),
        current_medications: z
            .string()
            .trim()
            .max(2000, "Current medications must be 2000 characters or less")
            .optional()
            .or(z.literal("")),
        triage_note: z.string().trim().max(2000, "Triage note must be 2000 characters or less").optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
        const s = data.systolic_bp;
        const d = data.diastolic_bp;
        if (typeof s === "number" && typeof d === "number" && s <= d) {            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["diastolic_bp"],
                message: "Diastolic BP must be lower than systolic BP",
            });
        }
    });

/** Validates raw form strings, returning a per-field error map. */
export function validateTriage(values) {
    const result = triageSchema.safeParse({ ...values, urgency_level: values.urgency_level || "routine" });
    if (result.success) return { ok: true, errors: {}, data: result.data };
    const errors = {};
    for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
}

/** Maps validated vitals to the numeric/null payload the API expects. */
export function triageVitalPayload(valid) {
    const vital_signs = {};
    for (const key of vitalKeys) {
        const value = valid[key];
        vital_signs[key] = typeof value === "number" ? value : null;
    }
    vital_signs.bmi = computeBmi(vital_signs.weight, vital_signs.height);
    return vital_signs;
}
