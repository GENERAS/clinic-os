import { describe, it, expect, vi, beforeEach } from "vitest";
import { TAX_CLASSES } from "@/features/insurance/services/insurance.service";

describe("TAX_CLASSES", () => {
  it("uses A/B/C/D keys (not exempt/standard/reduced)", () => {
    expect(TAX_CLASSES).toHaveProperty("A");
    expect(TAX_CLASSES).toHaveProperty("B");
    expect(TAX_CLASSES).toHaveProperty("C");
    expect(TAX_CLASSES).toHaveProperty("D");
    expect(TAX_CLASSES).not.toHaveProperty("exempt");
    expect(TAX_CLASSES).not.toHaveProperty("standard");
    expect(TAX_CLASSES).not.toHaveProperty("reduced");
  });

  it("Class A has 18% VAT rate", () => {
    expect(TAX_CLASSES.A.rate).toBe(18);
  });

  it("Class B (Essential) has 0% rate", () => {
    expect(TAX_CLASSES.B.rate).toBe(0);
  });

  it("Class C (Exempt Medical) has 0% rate", () => {
    expect(TAX_CLASSES.C.rate).toBe(0);
  });

  it("Class D (Fully Exempt) has 0% rate", () => {
    expect(TAX_CLASSES.D.rate).toBe(0);
  });
});

describe("InsuranceService (Round 1 regression)", () => {
  let mockSupabase;
  let service;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = (await import("@/lib/supabase/client")).createClient();
    const { InsuranceService } = await import("@/features/insurance/services/insurance.service");
    service = new InsuranceService(mockSupabase);
  });

  describe("submitClaim uses submission_date (not submitted_at)", () => {
    it("sets submission_date on claim submission", async () => {
      mockSupabase._state.errorResult = null;
      await service.submitClaim("clinic-1", "claim-1");

      expect(mockSupabase._state.updateData).toHaveProperty("submission_date");
      expect(mockSupabase._state.updateData).not.toHaveProperty("submitted_at");
      expect(mockSupabase._state.updateData.status).toBe("submitted");
    });
  });

  describe("createPreAuthorization uses created_by (not requested_by)", () => {
    it("sets created_by and provider fields correctly", async () => {
      mockSupabase._state.singleResult = { id: "auth-1" };
      mockSupabase._state.errorResult = null;

      await service.createPreAuthorization("clinic-1", {
        patient_id: "p-1",
        insurance_id: "ins-1",
        procedure_description: "MRI Brain",
        estimated_cost: 150000,
      }, "user-1");

      const data = mockSupabase._state.insertData;
      expect(data).toHaveProperty("created_by", "user-1");
      expect(data).not.toHaveProperty("requested_by");
      expect(data).not.toHaveProperty("diagnosis_code");
      expect(data).toHaveProperty("provider");
      expect(data).toHaveProperty("procedure_description", "MRI Brain");
    });
  });

  describe("checkAnnualCap uses date string (not toISOString)", () => {
    it("uses YYYY-MM-DD format for year start", async () => {
      mockSupabase._state.singleResult = {
        id: "ins-1", annual_limit: 500000, patient_id: "p-1", provider: "RSSB_RAMA",
      };
      mockSupabase._state.multiResult = [];
      mockSupabase._state.errorResult = null;

      await service.checkAnnualCap("clinic-1", "ins-1", 100000);

      // Verify the gte filter uses a date string, not an ISO timestamp with time component
      const yearStart = mockSupabase._state.gteFilters.created_at;
      expect(yearStart).toBeDefined();
      expect(yearStart).toMatch(/^\d{4}-01-01$/);
    });
  });
});
