import { describe, it, expect } from "vitest";
import { validateTriage, triageVitalPayload, triageSchema } from "./triage.schema";

const base = {
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    temperature: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    weight: "",
    height: "",
    urgency_level: "routine",
};

const withVitals = (over = {}) => ({ ...base, ...over });

describe("triageSchema", () => {
    it("accepts an entirely empty triage (all vitals blank)", () => {
        const r = validateTriage(base);
        expect(r.ok).toBe(true);
    });

    it("rejects negative systolic BP", () => {
        const r = validateTriage(withVitals({ systolic_bp: "-999" }));
        expect(r.ok).toBe(false);
        expect(r.errors.systolic_bp).toMatch(/between 30 and 300/);
    });

    it("rejects an out-of-range oxygen saturation", () => {
        const r = validateTriage(withVitals({ oxygen_saturation: "150" }));
        expect(r.ok).toBe(false);
        expect(r.errors.oxygen_saturation).toBeDefined();
    });

    it("rejects non-numeric temperature", () => {
        const r = validateTriage(withVitals({ temperature: "feverish" }));
        expect(r.ok).toBe(false);
        expect(r.errors.temperature).toMatch(/must be a number/);
    });

    it("rejects diastolic >= systolic", () => {
        const r = validateTriage(withVitals({ systolic_bp: "80", diastolic_bp: "120" }));
        expect(r.ok).toBe(false);
        expect(r.errors.diastolic_bp).toMatch(/lower than systolic/);
    });

    it("accepts a coherent BP pair", () => {
        const r = validateTriage(withVitals({ systolic_bp: "120", diastolic_bp: "80" }));
        expect(r.ok).toBe(true);
    });

    it("rejects zero height even though it is truthy as a string", () => {
        const r = validateTriage(withVitals({ weight: "70", height: "0" }));
        expect(r.ok).toBe(false);
        expect(r.errors.height).toBeDefined();
    });

    it("rejects an unknown urgency level", () => {
        expect(triageSchema.safeParse({ ...base, urgency_level: "whenever" }).success).toBe(false);
    });
});

describe("triageVitalPayload", () => {
    it("converts blank vitals to null rather than NaN", () => {
        const { ok, data } = validateTriage(base);
        expect(ok).toBe(true);
        const payload = triageVitalPayload(data);
        for (const [k, v] of Object.entries(payload)) {
            if (k === "bmi") continue;
            expect(v, k).toBeNull();
        }
        expect(payload.bmi).toBeNull();
    });

    it("never produces NaN or Infinity for any field", () => {
        const { data } = validateTriage(withVitals({ weight: "70", height: "175" }));
        const payload = triageVitalPayload(data);
        for (const [k, v] of Object.entries(payload)) {
            if (v === null) continue;
            expect(Number.isFinite(v), `${k} should be finite, got ${v}`).toBe(true);
        }
        expect(payload.bmi).toBe(22.9);
    });

    it("computes BMI from valid weight and height", () => {
        const { data } = validateTriage(withVitals({ weight: "80", height: "180" }));
        expect(triageVitalPayload(data).bmi).toBe(24.7);
    });

    it("omits BMI when only one of weight/height is present", () => {
        const { data } = validateTriage(withVitals({ weight: "80" }));
        expect(triageVitalPayload(data).bmi).toBeNull();
    });
});
