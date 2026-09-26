import { describe, it, expect } from "vitest";
import {
    phoneSchema,
    optionalPhoneSchema,
    emailSchema,
    optionalEmailSchema,
    nationalIdSchema,
    requiredUuid,
    nonNegativeNumber,
    positiveNumber,
    moneySchema,
    percentageSchema,
    isoDateSchema,
    pastOrTodayDateSchema,
    timeSchema,
    computeBmi,
    VITAL_RANGES,
    vitalSignSchema,
} from "./validation";

const digits = (v) => String(v).replace(/\D/g, "");

describe("phoneSchema", () => {
    it("accepts common Rwandan and international formats", () => {
        const valid = [
            "0788123456",
            "+250788123456",
            "+250 788 123 456",
            "078 812 3456",
            "(078) 812-3456",
        ];
        for (const v of valid) {
            expect(phoneSchema.safeParse(v).success, `expected ${v} to be valid`).toBe(true);
        }
    });

    it("rejects letters and symbols", () => {
        for (const v of ["abc", "0788abc456", "0788@1234", "+250788123456<script>", "0788#123"]) {
            expect(phoneSchema.safeParse(v).success, `expected ${v} to be rejected`).toBe(false);
        }
    });

    it("rejects empty and whitespace-only values", () => {
        expect(phoneSchema.safeParse("").success).toBe(false);
        expect(phoneSchema.safeParse("   ").success).toBe(false);
    });

    it("rejects values with fewer than 9 digits", () => {
        expect(phoneSchema.safeParse("12345").success).toBe(false);
    });

    it("rejects values with more than 15 digits", () => {
        expect(phoneSchema.safeParse("+2507881234567890123").success).toBe(false);
    });

    it("trims surrounding whitespace", () => {
        const r = phoneSchema.safeParse("  0788123456  ");
        expect(r.success).toBe(true);
        if (r.success) expect(r.data).toBe("0788123456");
    });

    it("rejects a 200-character string before evaluating digits", () => {
        const tooLong = "0".repeat(21);
        expect(digits(tooLong).length).toBeGreaterThan(15);
        expect(phoneSchema.safeParse(tooLong).success).toBe(false);
    });
});

describe("optionalPhoneSchema", () => {
    it("allows empty string, null and undefined", () => {
        expect(optionalPhoneSchema.safeParse("").success).toBe(true);
        expect(optionalPhoneSchema.safeParse(null).success).toBe(true);
        expect(optionalPhoneSchema.safeParse(undefined).success).toBe(true);
    });

    it("still validates format when a value is present", () => {
        expect(optionalPhoneSchema.safeParse("0788123456").success).toBe(true);
        expect(optionalPhoneSchema.safeParse("not-a-phone").success).toBe(false);
    });

    // The previous inline onboarding regex was /^\\+?[\\d\\s\\-()]{9,20}$/, which
    // counted 9-20 CHARACTERS, so "---------" (zero digits) passed.
    it("rejects punctuation-only strings that satisfy a naive char-count regex", () => {
        for (const junk of ["---------", "(((((((((", "+---------", "()()()()()()()()()", "-----------"]) {
            expect(
                /^\+?[\d\s\-()]{9,20}$/.test(junk),
                `sanity: the old regex wrongly accepts ${JSON.stringify(junk)}`
            ).toBe(true);
            expect(
                optionalPhoneSchema.safeParse(junk).success,
                `${JSON.stringify(junk)} must be rejected`
            ).toBe(false);
        }
    });

    it("treats whitespace-only as 'not provided' rather than invalid", () => {
        // A user who types only spaces means "no phone", not "bad phone".
        expect(optionalPhoneSchema.safeParse("         ").success).toBe(true);
    });
});

describe("emailSchema", () => {
    it("rejects malformed addresses", () => {
        for (const v of ["nope", "a@", "@b.com", "a b@c.com"]) {
            expect(emailSchema.safeParse(v).success, `expected ${v} to be rejected`).toBe(false);
        }
    });

    it("accepts a valid address and trims it", () => {
        const r = emailSchema.safeParse("  clinic@example.com  ");
        expect(r.success).toBe(true);
        if (r.success) expect(r.data).toBe("clinic@example.com");
    });

    it("optionalEmailSchema allows empty but validates present values", () => {
        expect(optionalEmailSchema.safeParse("").success).toBe(true);
        expect(optionalEmailSchema.safeParse("bad").success).toBe(false);
    });
});

describe("nationalIdSchema", () => {
    it("requires exactly 16 digits", () => {
        expect(nationalIdSchema.safeParse("1198700012345678").success).toBe(true);
        expect(nationalIdSchema.safeParse("12345").success).toBe(false);
        expect(nationalIdSchema.safeParse("11987000123456789").success).toBe(false);
        expect(nationalIdSchema.safeParse("119870001234567a").success).toBe(false);
    });
});

describe("requiredUuid", () => {
    it("reports the required message before the format message", () => {
        const r = requiredUuid("Doctor").safeParse("");
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe("Doctor is required");
    });

    it("reports a format message for a malformed uuid", () => {
        const r = requiredUuid("Doctor").safeParse("not-a-uuid");
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe("Doctor is invalid");
    });

    it("accepts a valid uuid", () => {
        expect(requiredUuid("Doctor").safeParse("3f2504e0-4f89-11d3-9a0c-0305e82c3301").success).toBe(true);
    });
});

describe("nonNegativeNumber", () => {
    it("rejects negatives", () => {
        const r = nonNegativeNumber("Amount").safeParse(-1);
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe("Amount cannot be negative");
    });

    it("rejects empty string and NaN", () => {
        expect(nonNegativeNumber("Amount").safeParse("").success).toBe(false);
        expect(nonNegativeNumber("Amount").safeParse("abc").success).toBe(false);
        expect(nonNegativeNumber("Amount").safeParse(NaN).success).toBe(false);
    });

    it("rejects Infinity", () => {
        expect(nonNegativeNumber("Amount").safeParse(Infinity).success).toBe(false);
    });

    it("accepts zero", () => {
        expect(nonNegativeNumber("Amount").safeParse(0).success).toBe(true);
    });

    it("coerces numeric strings", () => {
        const r = nonNegativeNumber("Amount").safeParse("1500");
        expect(r.success).toBe(true);
        if (r.success) expect(r.data).toBe(1500);
    });

    it("enforces max when provided", () => {
        expect(nonNegativeNumber("Age", { max: 130 }).safeParse(131).success).toBe(false);
        expect(nonNegativeNumber("Age", { max: 130 }).safeParse(130).success).toBe(true);
    });

    it("enforces integers when requested", () => {
        expect(nonNegativeNumber("Qty", { integer: true }).safeParse(1.5).success).toBe(false);
        expect(nonNegativeNumber("Qty", { integer: true }).safeParse(2).success).toBe(true);
    });
});

describe("positiveNumber", () => {
    it("rejects zero and negatives", () => {
        expect(positiveNumber("Amount").safeParse(0).success).toBe(false);
        expect(positiveNumber("Amount").safeParse(-5).success).toBe(false);
    });

    it("accepts a positive value", () => {
        expect(positiveNumber("Amount").safeParse(0.01).success).toBe(true);
    });
});

describe("moneySchema", () => {
    it("rejects negatives", () => {
        expect(moneySchema().safeParse(-500).success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
        expect(moneySchema().safeParse(10.001).success).toBe(false);
    });

    it("accepts 2 decimal places", () => {
        expect(moneySchema().safeParse(10.01).success).toBe(true);
    });
});

describe("percentageSchema", () => {
    it("accepts the 0-100 range", () => {
        expect(percentageSchema().safeParse(0).success).toBe(true);
        expect(percentageSchema().safeParse(100).success).toBe(true);
    });

    it("rejects out-of-range and negative values", () => {
        expect(percentageSchema().safeParse(101).success).toBe(false);
        expect(percentageSchema().safeParse(-1).success).toBe(false);
    });
});

describe("date schemas", () => {
    it("isoDateSchema requires YYYY-MM-DD", () => {
        expect(isoDateSchema().safeParse("2026-01-15").success).toBe(true);
        expect(isoDateSchema().safeParse("15/01/2026").success).toBe(false);
        expect(isoDateSchema().safeParse("2026-13-45").success).toBe(false);
    });

    // `new Date("2026-02-31T00:00:00")` silently rolls over to 2026-03-02, so a
    // regex + isNaN check alone would store the WRONG date for a mistyped DOB.
    it("isoDateSchema rejects dates that JS would silently roll over", () => {
        for (const impossible of ["2026-02-31", "2026-04-31", "2026-06-31", "2026-01-32", "2026-00-10", "2026-13-01"]) {
            expect(
                isoDateSchema().safeParse(impossible).success,
                `${impossible} must be rejected`
            ).toBe(false);
        }
    });

    it("isoDateSchema accepts genuine leap days and rejects fake ones", () => {
        expect(isoDateSchema().safeParse("2024-02-29").success).toBe(true);
        expect(isoDateSchema().safeParse("2026-02-29").success).toBe(false);
    });

    it("isoDateSchema accepts the last day of each real month", () => {
        const lastDays = ["2026-01-31", "2026-02-28", "2026-04-30", "2026-09-30", "2026-12-31"];
        for (const d of lastDays) {
            expect(isoDateSchema().safeParse(d).success, `${d} must be accepted`).toBe(true);
        }
    });

    it("pastOrTodayDateSchema rejects future dates", () => {
        const future = new Date();
        future.setFullYear(future.getFullYear() + 1);
        const iso = future.toISOString().slice(0, 10);
        expect(pastOrTodayDateSchema("Date of birth").safeParse(iso).success).toBe(false);
    });

    it("pastOrTodayDateSchema accepts today and the past", () => {
        const today = new Date().toISOString().slice(0, 10);
        expect(pastOrTodayDateSchema("Date of birth").safeParse(today).success).toBe(true);
        expect(pastOrTodayDateSchema("Date of birth").safeParse("1990-05-04").success).toBe(true);
    });
});

describe("timeSchema", () => {
    it("accepts 24-hour times", () => {
        expect(timeSchema().safeParse("00:00").success).toBe(true);
        expect(timeSchema().safeParse("23:59").success).toBe(true);
        expect(timeSchema().safeParse("09:30").success).toBe(true);
    });

    it("rejects invalid times", () => {
        for (const v of ["24:00", "12:60", "9:30", "0930", "noon"]) {
            expect(timeSchema().safeParse(v).success, `expected ${v} to be rejected`).toBe(false);
        }
    });
});

describe("computeBmi", () => {
    it("computes a known BMI", () => {
        expect(computeBmi(70, 175)).toBe(22.9);
    });

    it("returns null instead of Infinity when height is 0", () => {
        const bmi = computeBmi(70, 0);
        expect(bmi).toBeNull();
        expect(bmi === null || Number.isFinite(bmi)).toBe(true);
    });

    it("returns null for zero, negative and non-numeric input", () => {
        expect(computeBmi(0, 175)).toBeNull();
        expect(computeBmi(-5, 175)).toBeNull();
        expect(computeBmi(70, -175)).toBeNull();
        expect(computeBmi("", "")).toBeNull();
        expect(computeBmi(NaN, NaN)).toBeNull();
    });

    it("accepts numeric strings", () => {
        expect(computeBmi("70", "175")).toBe(22.9);
    });
});

describe("vitalSignSchema", () => {
    it("maps empty/null input to null", () => {
        for (const key of Object.keys(VITAL_RANGES)) {
            const r = vitalSignSchema(key).safeParse("");
            expect(r.success, key).toBe(true);
            if (r.success) expect(r.data).toBeNull();
        }
    });

    it("rejects negative vitals", () => {
        const r = vitalSignSchema("systolic_bp").safeParse(-999);
        expect(r.success).toBe(false);
    });

    it("rejects absurdly high oxygen saturation", () => {
        expect(vitalSignSchema("oxygen_saturation").safeParse(999).success).toBe(false);
    });

    it("rejects non-numeric text", () => {
        expect(vitalSignSchema("temperature").safeParse("hot").success).toBe(false);
    });

    it("accepts values inside the plausible range", () => {
        expect(vitalSignSchema("systolic_bp").safeParse(120).success).toBe(true);
        expect(vitalSignSchema("temperature").safeParse(37.5).success).toBe(true);
        expect(vitalSignSchema("oxygen_saturation").safeParse(98).success).toBe(true);
        expect(vitalSignSchema("weight").safeParse(70.5).success).toBe(true);
        expect(vitalSignSchema("height").safeParse(175).success).toBe(true);
    });

    it("accepts blood glucose inside its range", () => {
        expect(vitalSignSchema("blood_glucose").safeParse(95).success).toBe(true);
        expect(vitalSignSchema("blood_glucose").safeParse(9999).success).toBe(false);
    });

    it("throws for an unknown vital key", () => {
        expect(() => vitalSignSchema("not_a_vital")).toThrow();
    });
});
