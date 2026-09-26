import { describe, it, expect } from "vitest";
import {
    paymentSubmissionSchema,
    expenseSchema,
    taxSettingsSchema,
    insurancePlanSchema,
    insuranceClaimSchema,
    toFieldErrors,
} from "./billing.schema";

const payment = {
    payment_method: "mtn_momo",
    transaction_reference: "MTN-1234567890",
    amount: "25000",
    payer_name: "Jean Pierre",
    payer_phone: "0788123456",
};

describe("paymentSubmissionSchema", () => {
    it("accepts a valid submission and coerces the amount", () => {
        const r = paymentSubmissionSchema.safeParse(payment);
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.amount).toBe(25000);
    });

    it("rejects a negative amount", () => {
        const r = paymentSubmissionSchema.safeParse({ ...payment, amount: "-500" });
        expect(r.success).toBe(false);
        if (!r.success) expect(toFieldErrors(r.error).amount).toMatch(/greater than zero/);
    });

    it("rejects a zero amount", () => {
        expect(paymentSubmissionSchema.safeParse({ ...payment, amount: "0" }).success).toBe(false);
    });

    it("rejects an empty amount rather than treating it as 0", () => {
        const r = paymentSubmissionSchema.safeParse({ ...payment, amount: "" });
        expect(r.success).toBe(false);
    });

    it("rejects a non-numeric amount", () => {
        expect(paymentSubmissionSchema.safeParse({ ...payment, amount: "abc" }).success).toBe(false);
    });

    it("requires a transaction reference", () => {
        const r = paymentSubmissionSchema.safeParse({ ...payment, transaction_reference: "  " });
        expect(r.success).toBe(false);
        if (!r.success) expect(toFieldErrors(r.error).transaction_reference).toBeDefined();
    });

    it("validates the payer phone format when present", () => {
        expect(paymentSubmissionSchema.safeParse({ ...payment, payer_phone: "not-a-phone" }).success).toBe(false);
    });

    it("allows a blank payer phone", () => {
        expect(paymentSubmissionSchema.safeParse({ ...payment, payer_phone: "" }).success).toBe(true);
    });
});

describe("expenseSchema", () => {
    const expense = {
        category: "Rent",
        description: "January rent",
        amount: "150000",
        expense_date: "2026-01-15",
        payment_method: "bank",
        reference: "INV-1",
        notes: "",
    };

    it("accepts a valid expense", () => {
        expect(expenseSchema.safeParse(expense).success).toBe(true);
    });

    it("rejects a negative amount", () => {
        const r = expenseSchema.safeParse({ ...expense, amount: "-1" });
        expect(r.success).toBe(false);
        if (!r.success) expect(toFieldErrors(r.error).amount).toMatch(/greater than zero/);
    });

    it("rejects a malformed date", () => {
        const r = expenseSchema.safeParse({ ...expense, expense_date: "15/01/2026" });
        expect(r.success).toBe(false);
    });

    it("requires category and description", () => {
        const r = expenseSchema.safeParse({ ...expense, category: "", description: "" });
        expect(r.success).toBe(false);
        const errors = toFieldErrors(r.error);
        expect(errors.category).toBeDefined();
        expect(errors.description).toBeDefined();
    });
});

describe("taxSettingsSchema", () => {
    it("accepts tax rate 0 (the `|| 18` bug)", () => {
        const r = taxSettingsSchema.safeParse({
            tin_number: "123456789",
            business_name: "Clinic",
            ebm_serial_number: "EBM-1",
            tax_rate: "0",
            default_tax_class: "D",
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.tax_rate).toBe(0);
    });

    it("rejects a tax rate above 100", () => {
        const r = taxSettingsSchema.safeParse({ tax_rate: "150", default_tax_class: "D" });
        expect(r.success).toBe(false);
    });

    it("rejects a tax rate below 0", () => {
        const r = taxSettingsSchema.safeParse({ tax_rate: "-5", default_tax_class: "D" });
        expect(r.success).toBe(false);
    });

    it("rejects a TIN that is not 9 digits", () => {
        const r = taxSettingsSchema.safeParse({ tin_number: "123", tax_rate: "18", default_tax_class: "D" });
        expect(r.success).toBe(false);
        if (!r.success) expect(toFieldErrors(r.error).tin_number).toBeDefined();
    });
});

describe("insurancePlanSchema", () => {
    it("accepts a valid plan", () => {
        const r = insurancePlanSchema.safeParse({
            provider: "Sonarwa",
            plan_name: "Gold Plus",
            annual_limit: "5000000",
            pre_auth_required_above: "100000",
            coverage_type: "80",
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.coverage_type).toBe(80);
    });

    it("rejects a negative annual limit", () => {
        const r = insurancePlanSchema.safeParse({
            provider: "Sonarwa",
            plan_name: "Gold",
            annual_limit: "-1",
            coverage_type: "80",
        });
        expect(r.success).toBe(false);
    });

    it("rejects coverage above 100", () => {
        const r = insurancePlanSchema.safeParse({ provider: "S", plan_name: "G", coverage_type: "120" });
        expect(r.success).toBe(false);
    });

    it("allows a blank annual limit", () => {
        const r = insurancePlanSchema.safeParse({ provider: "S", plan_name: "G", annual_limit: "", coverage_type: "80" });
        expect(r.success).toBe(true);
    });
});

describe("insuranceClaimSchema", () => {
    const claim = {
        patient_id: "p1",
        invoice_id: "i1",
        provider: "Sonarwa",
        policy_number: "POL-1",
        total_amount: "100000",
        covered_amount: "80000",
        co_pay_amount: "20000",
    };

    it("accepts a balanced claim", () => {
        expect(insuranceClaimSchema.safeParse(claim).success).toBe(true);
    });

    it("rejects covered + co-pay exceeding the total", () => {
        const r = insuranceClaimSchema.safeParse({ ...claim, covered_amount: "90000" });
        expect(r.success).toBe(false);
        if (!r.success) expect(toFieldErrors(r.error).covered_amount).toMatch(/cannot exceed the total/);
    });

    it("rejects a negative covered amount", () => {
        const r = insuranceClaimSchema.safeParse({ ...claim, covered_amount: "-1" });
        expect(r.success).toBe(false);
    });

    it("requires patient and invoice", () => {
        const r = insuranceClaimSchema.safeParse({ ...claim, patient_id: "", invoice_id: "" });
        expect(r.success).toBe(false);
        const errors = toFieldErrors(r.error);
        expect(errors.patient_id).toBeDefined();
        expect(errors.invoice_id).toBeDefined();
    });
});

describe("toFieldErrors", () => {
    it("maps the first issue per field into a plain object", () => {
        const r = expenseSchema.safeParse({ category: "", description: "", amount: "-1" });
        expect(r.success).toBe(false);
        const errors = toFieldErrors(r.error);
        expect(Object.keys(errors).sort()).toEqual(["amount", "category", "description"]);
        for (const v of Object.values(errors)) expect(typeof v).toBe("string");
    });
});
