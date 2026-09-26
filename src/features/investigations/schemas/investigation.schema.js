import { z } from "zod";

/**
 * Lab result entry. Some analytes are numeric, others are qualitative
 * ("Positive"/"Negative"/"Reactive"), so result_value stays free text but is
 * required once a test is marked completed, and numeric-looking values are
 * range-checked for sanity.
 */
export const investigationResultSchema = z
    .object({
        result_value: z
            .string()
            .trim()
            .max(200, "Result value is too long")
            .optional()
            .or(z.literal("")),
        result_unit: z.string().trim().max(50, "Unit is too long").optional().or(z.literal("")),
        reference_range: z
            .string()
            .trim()
            .max(100, "Reference range is too long")
            .optional()
            .or(z.literal(""))
            .refine(
                (v) => v === "" || /^[<>≤≥\d.\s,\-–—/]+(,[<>≤≥\d.\s,\-–—/]+)*$/.test(v) || !/\d/.test(v),
                "Reference range looks invalid (example: 3.5-5.5)"
            ),
        result_notes: z.string().trim().max(2000, "Notes must be 2000 characters or less").optional().or(z.literal("")),
        status: z.enum(["completed", "in_progress", "sample_collected"]),
        is_abnormal: z.boolean(),
    })
    .superRefine((data, ctx) => {
        const value = data.result_value;
        if (data.status === "completed" && !value) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["result_value"],
                message: "A result value is required to mark this test completed",
            });
            return;
        }
        if (!value) return;
        // Reject absurd magnitudes that are almost certainly decimal-point slips.
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            const num = Number(value);
            if (!Number.isFinite(num) || Math.abs(num) > 1_000_000) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["result_value"],
                    message: "Result value is out of range — please re-check",
                });
            }
        }
    });

/** Validates and returns a per-field error map plus a coerced payload. */
export function validateInvestigationResult(values) {
    const result = investigationResultSchema.safeParse({
        result_value: values.result_value ?? "",
        result_unit: values.result_unit ?? "",
        reference_range: values.reference_range ?? "",
        result_notes: values.result_notes ?? "",
        status: values.status,
        is_abnormal: Boolean(values.is_abnormal),
    });
    if (result.success) {
        return {
            ok: true,
            errors: {},
            data: {
                result_value: result.data.result_value,
                result_unit: result.data.result_unit || null,
                reference_range: result.data.reference_range || null,
                result_notes: result.data.result_notes || null,
                status: result.data.status,
                is_abnormal: result.data.is_abnormal,
            },
        };
    }
    const errors = {};
    for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
}
