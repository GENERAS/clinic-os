import { z } from "zod";

/**
 * Canonical input-validation primitives.
 * Every feature schema should compose from these instead of redefining rules.
 */

/** Accepts "", null and undefined as "not provided". */
export const emptyToUndefined = (schema) =>
    z.preprocess(
        (v) => (v === "" || v === null ? undefined : v),
        schema.optional()
    );

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

/**
 * Phone numbers are stored and dialled in a variety of formats, so we validate
 * structurally (7-15 digits, optional +/spaces/dashes/parens) rather than
 * forcing one national format.
 */
export const phoneSchema = z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(20, "Phone must be 20 characters or less")
    .regex(/^\+?[\d\s\-()]+$/, "Phone may only contain digits, spaces, +, - and ( )")
    .refine((v) => digitsOnly(v).length >= 9, "Enter a valid phone number")
    .refine((v) => digitsOnly(v).length <= 15, "Phone number is too long");

export const optionalPhoneSchema = z
    .string()
    .trim()
    .max(20, "Phone must be 20 characters or less")
    .regex(/^\+?[\d\s\-()]*$/, "Phone may only contain digits, spaces, +, - and ( )")
    .refine((v) => v === "" || digitsOnly(v).length >= 9, "Enter a valid phone number")
    .optional()
    .nullable()
    .or(z.literal(""));

export const emailSchema = z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long");

export const optionalEmailSchema = z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254, "Email is too long")
    .optional()
    .nullable()
    .or(z.literal(""));

/** Rwandan National ID: exactly 16 digits. */
export const nationalIdSchema = z
    .string()
    .trim()
    .regex(/^\d{16}$/, "National ID must be exactly 16 digits")
    .optional()
    .nullable()
    .or(z.literal(""));

/**
 * Required UUID. Checks presence BEFORE format so the field-level
 * "required" message is reachable instead of being masked by a format error.
 */
export const requiredUuid = (label) =>
    z.string().trim().min(1, `${label} is required`).uuid(`${label} is invalid`);

export const optionalUuid = z.string().trim().uuid("Invalid identifier").optional().nullable().or(z.literal(""));

/**
 * `z.coerce.number()` maps "" and whitespace to 0, which would silently turn an
 * empty amount field into a valid zero. `rejectBlank` preprocesses blank input
 * to NaN so the field is rejected instead.
 */
const rejectBlank = (value) => (typeof value === "string" && value.trim() === "" ? Number.NaN : value);

const buildNumberSchema = (label, { max, integer = false } = {}) => {
    let schema = z.coerce
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a finite number`);
    if (integer) schema = schema.int(`${label} must be a whole number`);
    if (max !== undefined) schema = schema.max(max, `${label} must be at most ${max}`);
    return schema;
};

/** A number that must be present, finite and >= 0. Rejects "", NaN, Infinity. */
export const nonNegativeNumber = (label, opts = {}) =>
    z.preprocess(rejectBlank, buildNumberSchema(label, opts).min(0, `${label} cannot be negative`));

/** A number that must be present, finite and > 0. */
export const positiveNumber = (label, opts = {}) =>
    z.preprocess(
        rejectBlank,
        buildNumberSchema(label, opts).positive(`${label} must be greater than zero`)
    );

/** Money amount: non-negative, max 2 decimal places. */
export const moneySchema = (label = "Amount") =>
    nonNegativeNumber(label, { max: 1_000_000_000 }).refine(
        (v) => Math.round(v * 100) === v * 100,
        `${label} cannot have more than 2 decimal places`
    );

/** A percentage in the 0-100 range. */
export const percentageSchema = (label = "Percentage") =>
    z.coerce
        .number({ invalid_type_error: `${label} must be a number` })
        .min(0, `${label} cannot be negative`)
        .max(100, `${label} cannot exceed 100`);

/**
 * True when `yyyy-mm-dd` is a real calendar date.
 *
 * `new Date("2026-02-31T00:00:00")` does NOT throw — JS silently rolls it over
 * to 2026-03-02, so a regex + `isNaN` check alone would happily accept an
 * impossible date and store the wrong one. Comparing the parsed components
 * against the input catches those rollovers while still allowing real
 * leap days (2024-02-29) and rejecting non-leap ones (2026-02-29).
 */
function isRealCalendarDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, y, m, d] = match.map(Number);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
        date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    );
}

/** YYYY-MM-DD that is a real calendar date. */
export const isoDateSchema = (label = "Date") =>
    z
        .string()
        .trim()
        .min(1, `${label} is required`)
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`)
        .refine(isRealCalendarDate, `${label} must be a real calendar date`);

/** YYYY-MM-DD that must not be in the future. */
export const pastOrTodayDateSchema = (label = "Date") =>
    isoDateSchema(label).refine((v) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(`${v}T00:00:00`) <= today;
    }, `${label} cannot be in the future`);

/** HH:MM 24-hour. */
export const timeSchema = (label = "Time") =>
    z
        .string()
        .trim()
        .min(1, `${label} is required`)
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} must be a valid time`);

/** Zod `.refine` helper for a { start, end } pair of HH:MM strings. */
export const endAfterStartRefinement = (startKey, endKey, message = "End time must be after start time") => ({
    message,
    path: [endKey],
    refine: (data) => {
        const start = data?.[startKey];
        const end = data?.[endKey];
        if (!start || !end) return true;
        return start < end;
    },
});

/** Zod `.refine` helper asserting a date is not in the past. */
export const notInPastRefinement = (dateKey, message = "Cannot be in the past") => ({
    message,
    path: [dateKey],
    refine: (data) => {
        const value = data?.[dateKey];
        if (!value) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(`${value}T00:00:00`) >= today;
    },
});

/**
 * Clinical vital ranges. Values outside these bounds are almost certainly a
 * typo or a mis-keyed decimal, and silently storing them is a patient-safety
 * risk. Order-of-magnitude generous bounds, not clinical advice.
 */
export const VITAL_RANGES = {
    systolic_bp: { min: 30, max: 300, step: 1, unit: "mmHg", label: "Systolic BP" },
    diastolic_bp: { min: 10, max: 200, step: 1, unit: "mmHg", label: "Diastolic BP" },
    heart_rate: { min: 10, max: 300, step: 1, unit: "bpm", label: "Heart rate" },
    temperature: { min: 25, max: 45, step: 0.1, unit: "°C", label: "Temperature" },
    respiratory_rate: { min: 1, max: 100, step: 1, unit: "bpm", label: "Respiratory rate" },
    oxygen_saturation: { min: 1, max: 100, step: 1, unit: "%", label: "Oxygen saturation" },
    weight: { min: 0.1, max: 500, step: 0.1, unit: "kg", label: "Weight" },
    height: { min: 10, max: 300, step: 0.1, unit: "cm", label: "Height" },
    blood_glucose: { min: 10, max: 1000, step: 0.1, unit: "mg/dL", label: "Blood glucose" },
};

/**
 * Builds a Zod schema for one vital sign that accepts "" / null as "not taken"
 * and otherwise coerces to a finite number inside the plausible range.
 * Output is always `number | null`.
 */
export function vitalSignSchema(key) {
    const range = VITAL_RANGES[key];
    if (!range) throw new Error(`Unknown vital sign: ${key}`);
    return z
        .union([z.string(), z.number(), z.null()])
        .transform((v) => {
            if (v === "" || v === null || v === undefined) return null;
            if (typeof v === "string" && v.trim() === "") return null;
            const num = typeof v === "number" ? v : Number(String(v).trim());
            return num;
        })
        .superRefine((value, ctx) => {
            if (value === null) return;
            if (!Number.isFinite(value)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${range.label} must be a number` });
                return;
            }
            if (value < range.min || value > range.max) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${range.label} must be between ${range.min} and ${range.max} ${range.unit}`,
                });
            }
        });
}

/** BMI from weight (kg) and height (cm). Returns null when not computable. */
export function computeBmi(weightKg, heightCm) {
    const w = typeof weightKg === "number" ? weightKg : parseFloat(weightKg);
    const h = typeof heightCm === "number" ? heightCm : parseFloat(heightCm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const bmi = w / (h / 100) ** 2;
    if (!Number.isFinite(bmi) || bmi <= 0 || bmi > 200) return null;
    return Math.round(bmi * 10) / 10;
}
