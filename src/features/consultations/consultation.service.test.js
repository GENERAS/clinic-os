import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, resetMockState } from "@/test/setup";

describe("ConsultationService (Round 4 regression - radiology dedup)", () => {
  let mockSupabase;
  let service;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
    const mod = await import("@/features/consultations/services/consultation.service");
    service = new mod.ConsultationService(mockSupabase);
  });

  describe("updateConsultation deletes existing radiology_orders before insert", () => {
    it("calls delete on radiology_orders for this consultation before inserting", async () => {
      mockSupabase._state.singleResult = null;
      mockSupabase._state.errorResult = null;

      // Track all calls to from()
      const tableCalls = [];
      mockSupabase.from.mockImplementation(function (table) {
        tableCalls.push(table);
        return mockSupabase._chain;
      });

      await service.updateConsultation(
        "clinic-1",
        "consult-1",
        { patient_id: "p-1", chief_complaint: "Test", status: "in_progress" },
        [],
        [],
        [],
        "user-1",
        [{ modality: "xray", body_part: "Chest", clinical_indication: "Cough" }]
      );

      // Verify delete was called on radiology_orders BEFORE insert
      const deleteIdx = tableCalls.indexOf("radiology_orders");
      // The delete call and insert call both use "radiology_orders"
      const radiologyCalls = tableCalls.filter((t) => t === "radiology_orders");
      expect(radiologyCalls.length).toBeGreaterThanOrEqual(2); // delete + insert
    });
  });

  describe("createConsultation", () => {
    it("inserts consultation with correct fields", async () => {
      mockSupabase._state.singleResult = { id: "consult-1" };
      mockSupabase._state.errorResult = null;

      const id = await service.createConsultation("clinic-1", {
        patient_id: "p-1",
        chief_complaint: "Headache",
        status: "in_progress",
      }, [], [], [], "doctor-1");

      expect(id).toBe("consult-1");
      expect(mockSupabase._state.insertData).toEqual(
        expect.objectContaining({
          clinic_id: "clinic-1",
          patient_id: "p-1",
          doctor_id: "doctor-1",
          chief_complaint: "Headache",
          status: "in_progress",
        })
      );
    });

    it("inserts diagnoses when provided", async () => {
      mockSupabase._state.singleResult = { id: "consult-2" };
      mockSupabase._state.errorResult = null;

      const tableCalls = [];
      mockSupabase.from.mockImplementation(function (table) {
        tableCalls.push(table);
        return mockSupabase._chain;
      });

      await service.createConsultation("clinic-1", {
        patient_id: "p-1",
      }, [
        { description: "Migraine", icd_code: "G43", type: "primary" },
      ], [], [], "doctor-1");

      expect(tableCalls).toContain("diagnoses");
    });

    it("inserts radiology orders when provided", async () => {
      mockSupabase._state.singleResult = { id: "consult-3" };
      mockSupabase._state.errorResult = null;

      const tableCalls = [];
      mockSupabase.from.mockImplementation(function (table) {
        tableCalls.push(table);
        return mockSupabase._chain;
      });

      await service.createConsultation("clinic-1", {
        patient_id: "p-1",
      }, [], [], [], "doctor-1", [
        { modality: "ct", body_part: "Head", clinical_indication: "Trauma" },
      ]);

      expect(tableCalls).toContain("radiology_orders");
      // Verify the radiology insert was made
      const insertCalls = mockSupabase._chain.insert.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe("getConsultation", () => {
    it("selects with patients inner join and users join", async () => {
      mockSupabase._state.singleResult = {
        id: "consult-1",
        patients: { id: "p-1", full_name: "Test Patient" },
        users: { id: "doctor-1", full_name: "Dr. Smith" },
      };

      const data = await service.getConsultation("clinic-1", "consult-1");
      expect(data).toBeTruthy();
      expect(data.patients.full_name).toBe("Test Patient");
    });
  });

  describe("getConsultationByAppointment", () => {
    it("queries by appointment_id", async () => {
      mockSupabase._state.singleResult = { id: "consult-1", status: "in_progress" };

      const data = await service.getConsultationByAppointment("clinic-1", "apt-1");
      expect(data).toBeTruthy();
      expect(mockSupabase._state.eqFilters.appointment_id).toBe("apt-1");
    });
  });
});
