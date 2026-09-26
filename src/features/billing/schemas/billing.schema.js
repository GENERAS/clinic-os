import { z } from "zod";
import {
    optionalPhoneSchema,
    nonNegativeNumber,
    positiveNumber,
    percentageSchema,
    isoDateSchema,
} from "@/lib/validation";

const rwfAmount = (label) => positiveNumber(label, { max: 1_000_000_000 });

/** An amount field that may be left blank, but is range-checked when present. */
const optionalAmount = z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? undefined : v))
    .pipe(nonNegativeNumber("Amount", { max: 1_000_000_000 }).optional());

export const paymentSubmissionSchema = z.object({
    payment_method: z.string().trim().min(1, "Select a payment method"),
    transaction_reference: z
        .string()
        .trim()
        .min(1, "Transaction reference is required")
        .max(100, "Transaction reference is too long"),
    amount: rwfAmount("Amount"),
    payer_name: z.string().trim().max(200, "Payer name is too long").optional().or(z.literal("")),
    payer_phone: optionalPhoneSchema,
});

export const expenseSchema = z.object({
    category: z.string().trim().min(1, "Category is required").max(100),
    description: z.string().trim().min(1, "Description is required").max(500),
    amount: rwfAmount("Amount"),
    expense_date: isoDateSchema("Date").optional().or(z.literal("")),
    payment_method: z.string().trim().max(50).optional().or(z.literal("")),
    reference: z.string().trim().max(200, "Reference is too long").optional().or(z.literal("")),
    notes: z.string().trim().max(2000, "Notes must be 2000 characters or less").optional().or(z.literal("")),
});

export const taxSettingsSchema = z.object({
    tin_number: z
        .string()
        .trim()
        .regex(/^\d{9}$/, "TIN must be exactly 9 digits")
        .optional()
        .or(z.literal("")),
    business_name: z.string().trim().max(200, "Business name is too long").optional().or(z.literal("")),
    ebm_serial_number: z.string().trim().max(100, "EBM serial is too long").optional().or(z.literal("")),
    tax_rate: percentageSchema("Tax rate"),
    default_tax_class: z.string().trim().min(1, "Tax class is required").max(10),
});

export const insurancePlanSchema = z.object({
    provider: z.string().trim().min(1, "Provider is required").max(200),
    plan_name: z.string().trim().min(1, "Plan name is required").max(200),
    annual_limit: optionalAmount,
    pre_auth_required_above: optionalAmount,
    coverage_type: percentageSchema("Coverage"),
    description: z.string().trim().max(1000, "Description is too long").optional().or(z.literal("")),
});

export const insuranceClaimSchema = z
    .object({
        patient_id: z.string().trim().min(1, "Patient is required"),
        invoice_id: z.string().trim().min(1, "Invoice is required"),
        provider: z.string().trim().max(200).optional().or(z.literal("")),
        policy_number: z.string().trim().max(100).optional().or(z.literal("")),
        total_amount: optionalAmount,
        covered_amount: optionalAmount,
        co_pay_amount: optionalAmount,
        notes: z.string().trim().max(2000, "Notes must be 2000 characters or less").optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
        const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
        const total = num(data.total_amount);
        const covered = num(data.covered_amount);
        const copay = num(data.co_pay_amount);
        if (total !== null && covered !== null && copay !== null && covered + copay > total) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["covered_amount"],
                message: "Covered + co-pay cannot exceed the total amount",
            });
        }
    });

/** Validates and returns a per-field error map from a ZodError. */
export function toFieldErrors(error) {
    const errors = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
}
