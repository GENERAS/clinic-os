import { describe, it, expect } from "vitest";
import { validateInvestigationResult } from "./investigation.schema";

const base = {
    result_value: "",
    result_unit: "",
    reference_range: "",
    result_notes: "",
    status: "completed",
    is_abnormal: false,
};

describe("validateInvestigationResult", () => {
    it("rejects a completed test with no result value", () => {
        const r = validateInvestigationResult(base);
        expect(r.ok).toBe(false);
        expect(r.errors.result_value).toMatch(/required/);
    });

    it("allows an empty result when the test is not completed", () => {
        const r = validateInvestigationResult({ ...base, status: "sample_collected" });
        expect(r.ok).toBe(true);
    });

    it("allows an empty result while the test is in progress", () => {
        const r = validateInvestigationResult({ ...base, status: "in_progress" });
        expect(r.ok).toBe(true);
    });

    it("accepts a numeric result", () => {
        const r = validateInvestigationResult({ ...base, result_value: "5.2" });
        expect(r.ok).toBe(true);
        expect(r.data.result_value).toBe("5.2");
    });

    it("accepts a qualitative result", () => {
        const r = validateInvestigationResult({ ...base, result_value: "Positive" });
        expect(r.ok).toBe(true);
    });

    it("rejects a decimal-point slip", () => {
        const r = validateInvestigationResult({ ...base, result_value: "99999999" });
        expect(r.ok).toBe(false);
        expect(r.errors.result_value).toMatch(/out of range/);
    });

    it("trims whitespace-only input to a required error", () => {
        const r = validateInvestigationResult({ ...base, result_value: "   " });
        expect(r.ok).toBe(false);
        expect(r.errors.result_value).toBeDefined();
    });

    it("rejects an unknown status", () => {
        const r = validateInvestigationResult({ ...base, status: "cancelled", result_value: "5" });
        expect(r.ok).toBe(false);
    });

    it("normalises empty optional fields to null", () => {
        const r = validateInvestigationResult({ ...base, result_value: "Negative", result_unit: "" });
        expect(r.ok).toBe(true);
        expect(r.data.result_unit).toBeNull();
        expect(r.data.reference_range).toBeNull();
        expect(r.data.result_notes).toBeNull();
    });

    it("accepts a typical reference range", () => {
        const r = validateInvestigationResult({ ...base, result_value: "5.2", reference_range: "3.5-5.5" });
        expect(r.ok).toBe(true);
    });

    it("accepts a reference range containing inequality operators", () => {
        const r = validateInvestigationResult({ ...base, result_value: "5.2", reference_range: "<5.0" });
        expect(r.ok).toBe(true);
    });

    it("preserves the abnormal flag", () => {
        const r = validateInvestigationResult({ ...base, result_value: "9.9", is_abnormal: true });
        expect(r.ok).toBe(true);
        expect(r.data.is_abnormal).toBe(true);
    });
});
