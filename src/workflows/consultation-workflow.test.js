import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test/setup";

describe("Consultation Lifecycle (create → diagnoses/prescriptions → complete)", () => {
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

  it("full lifecycle: create → add diagnoses/prescriptions/radiology → complete", async () => {
    // Step 1: Create consultation
    mockSupabase._state.singleResult = { id: "consult-1" };
    mockSupabase._state.errorResult = null;

    const tableCalls = [];
    mockSupabase.from.mockImplementation(function (table) {
      tableCalls.push(table);
      return mockSupabase._chain;
    });

    const consultId = await service.createConsultation("clinic-1", {
      patient_id: "p-1",
      chief_complaint: "Fever and headache for 3 days",
      history_of_presenting_illness: "Started 3 days ago, gradually worsening",
      vital_signs: { temperature: 38.5, blood_pressure: "120/80" },
      status: "in_progress",
    }, [
      { description: "Malaria", icd_code: "B54", type: "primary" },
      { description: "Tension headache", icd_code: "G44.2", type: "secondary" },
    ], [
      { medicine_name: "Artemether-Lumefantrine", strength: "20/120mg", form: "tablet", dosage: "2 tablets", frequency: "twice_daily", duration: "3 days", quantity: 12, route: "oral" },
    ], [
      { test_name: "Malaria RDT", category: "microbiology" },
    ], "doctor-1", [
      { modality: "xray", body_part: "Chest", clinical_indication: "Persistent cough" },
    ]);

    expect(consultId).toBe("consult-1");
    expect(tableCalls).toContain("consultations");
    expect(tableCalls).toContain("diagnoses");
    expect(tableCalls).toContain("prescriptions");
    expect(tableCalls).toContain("investigations");
    expect(tableCalls).toContain("radiology_orders");

    // Step 2: Update/Complete consultation
    mockSupabase._state.errorResult = null;
    let updateCallNum = 0;
    mockSupabase.from.mockImplementation(function (table) {
      updateCallNum++;
      if (table === "consultations" && updateCallNum <= 2) {
        // First two: update consultation + check appointment_id
        mockSupabase._state.singleResult = { appointment_id: "apt-1" };
      } else if (table === "appointments" && updateCallNum <= 4) {
        mockSupabase._state.singleResult = { status: "in_progress" };
      }
      return mockSupabase._chain;
    });

    await service.completeConsultation("clinic-1", "consult-1", {
      patient_id: "p-1",
      assessment: "Malaria",
      treatment_plan: "ACT course + paracetamol",
      follow_up_instructions: "Return in 3 days if symptoms persist",
    }, [
      { description: "Malaria", icd_code: "B54", type: "primary" },
    ], [
      { medicine_name: "Artemether-Lumefantrine", dosage: "2 tablets", frequency: "twice_daily" },
    ], [], "doctor-1");

    // Verify the complete consultation calls update with status: completed
    expect(mockSupabase._state.updateData.status).toBe("completed");
  });

  it("getPatientVisits returns visit history with doctor names", async () => {
    mockSupabase._state.multiResult = [
      {
        id: "c-1",
        created_at: "2026-07-13T10:00:00Z",
        chief_complaint: "Headache",
        status: "completed",
        users: { id: "d-1", full_name: "Dr. Smith" },
        diagnoses: [{ description: "Migraine", type: "primary" }],
        prescriptions: [{ medicine_name: "Ibuprofen" }],
      },
    ];

    const visits = await service.getPatientVisits("clinic-1", "p-1");
    expect(visits).toHaveLength(1);
    expect(visits[0].chief_complaint).toBe("Headache");
    expect(visits[0].users.full_name).toBe("Dr. Smith");
  });

  it("updateConsultation replaces all child records (delete + re-insert)", async () => {
    mockSupabase._state.errorResult = null;

    const tableCalls = [];
    mockSupabase.from.mockImplementation(function (table) {
      tableCalls.push(table);
      return mockSupabase._chain;
    });

    await service.updateConsultation("clinic-1", "consult-1", {
      patient_id: "p-1",
      chief_complaint: "Updated complaint",
      status: "in_progress",
    }, [
      { description: "New diagnosis", type: "primary" },
    ], [], [], "doctor-1", []);

    // Verify delete was called for diagnoses, prescriptions, investigations, radiology_orders
    const deleteCalls = tableCalls.filter((t) =>
      ["diagnoses", "prescriptions", "investigations", "radiology_orders"].includes(t)
    );
    expect(deleteCalls.length).toBeGreaterThanOrEqual(4);
  });

  it("deleteConsultation removes consultation record", async () => {
    mockSupabase._state.errorResult = null;

    await service.deleteConsultation("clinic-1", "consult-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("consultations");
    expect(mockSupabase._state.eqFilters.id).toBe("consult-1");
  });
});
