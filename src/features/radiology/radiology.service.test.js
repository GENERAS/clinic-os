import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, resetMockState } from "@/test/setup";

describe("RadiologyService (Round 4 fixes)", () => {
  let mockSupabase;
  let service;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
    const mod = await import("@/features/radiology/services/radiology.service");
    service = new mod.RadiologyService(mockSupabase);
  });

  describe("uploadImage uses signed URL for private bucket", () => {
    it("calls createSignedUrl instead of getPublicUrl", async () => {
      const storageFrom = mockSupabase.storage.from();
      mockSupabase._state.singleResult = { id: "img-1" };
      mockSupabase._state.errorResult = null;

      await service.uploadImage("clinic-1", "order-1", {
        name: "xray.dcm",
        size: 1024000,
        type: "application/dicom",
      }, "user-1");

      expect(storageFrom.createSignedUrl).toHaveBeenCalled();
      expect(storageFrom.getPublicUrl).not.toHaveBeenCalled();
    });

    it("stores signed URL as file_url", async () => {
      mockSupabase._state.singleResult = { id: "img-1" };
      mockSupabase._state.errorResult = null;

      await service.uploadImage("clinic-1", "order-1", {
        name: "xray.dcm",
        size: 1024000,
        type: "application/dicom",
      }, "user-1");

      const insertData = mockSupabase._state.insertData;
      expect(insertData.file_url).toContain("signed");
    });
  });

  describe("getSignedUrl method exists", () => {
    it("returns signed URL for storage path", async () => {
      const url = await service.getSignedUrl("clinic-1/order-1/file.dcm");
      expect(url).toBeTruthy();
    });

    it("returns null for empty path", async () => {
      const url = await service.getSignedUrl(null);
      expect(url).toBeNull();
    });
  });

  describe("transitionStatus validates transitions (Round 4 fix)", () => {
    it("allows ordered -> scheduled", async () => {
      mockSupabase._state.singleResult = { status: "ordered" };
      mockSupabase._state.errorResult = null;

      await service.transitionStatus("clinic-1", "order-1", "scheduled", "user-1");
      expect(mockSupabase._state.updateData.status).toBe("scheduled");
    });

    it("blocks ordered -> completed (invalid transition)", async () => {
      mockSupabase._state.singleResult = { status: "ordered" };
      mockSupabase._state.errorResult = null;

      await expect(
        service.transitionStatus("clinic-1", "order-1", "completed", "user-1")
      ).rejects.toThrow('Cannot transition from "ordered" to "completed"');
    });

    it("blocks completed -> ordered (no backward transitions)", async () => {
      mockSupabase._state.singleResult = { status: "completed" };
      mockSupabase._state.errorResult = null;

      await expect(
        service.transitionStatus("clinic-1", "order-1", "ordered", "user-1")
      ).rejects.toThrow('Cannot transition from "completed" to "ordered"');
    });

    it("allows full lifecycle: ordered -> scheduled -> imaging_done -> report_written -> completed", async () => {
      const transitions = ["scheduled", "imaging_done", "report_written", "completed"];
      for (const next of transitions) {
        vi.clearAllMocks();
        mockSupabase._state.singleResult = { status: next === "scheduled" ? "ordered" : transitions[transitions.indexOf(next) - 1] };
        mockSupabase._state.errorResult = null;

        await service.transitionStatus("clinic-1", "order-1", next, "user-1");
        expect(mockSupabase._state.updateData.status).toBe(next);
      }
    });

    it("allows cancellation from any non-terminal state", async () => {
      mockSupabase._state.singleResult = { status: "scheduled" };
      mockSupabase._state.errorResult = null;

      await service.transitionStatus("clinic-1", "order-1", "cancelled", "user-1");
      expect(mockSupabase._state.updateData.status).toBe("cancelled");
    });
  });

  describe("createOrder", () => {
    it("inserts with correct fields", async () => {
      mockSupabase._state.singleResult = { id: "order-1" };
      mockSupabase._state.errorResult = null;

      await service.createOrder("clinic-1", {
        patient_id: "p-1",
        modality: "xray",
        body_part: "Chest",
        clinical_indication: "Cough for 2 weeks",
      }, "user-1");

      expect(mockSupabase._state.insertData).toEqual(
        expect.objectContaining({
          clinic_id: "clinic-1",
          patient_id: "p-1",
          modality: "xray",
          body_part: "Chest",
          status: "ordered",
          ordered_by: "user-1",
        })
      );
    });
  });

  describe("saveReport", () => {
    it("creates new report with radiologist_id", async () => {
      mockSupabase._state.singleResult = null; // No existing report
      mockSupabase._state.errorResult = null;

      // Mock the insert to return an id
      const origFrom = mockSupabase.from;
      let callNum = 0;
      mockSupabase.from.mockImplementation(function (table) {
        callNum++;
        if (callNum <= 1) {
          // Existing report check
          mockSupabase._state.singleResult = null;
        } else if (callNum <= 3) {
          // Insert report
          mockSupabase._state.singleResult = { id: "report-1" };
        }
        return mockSupabase._chain;
      });

      const reportId = await service.saveReport("clinic-1", "order-1", {
        findings: "Normal chest X-ray",
        impression: "No acute abnormality",
        status: "draft",
      }, "radiologist-1");

      expect(reportId).toBe("report-1");
    });
  });
});
