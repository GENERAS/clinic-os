import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test/setup";

describe("Radiology Pipeline (order → schedule → imaging → report → complete)", () => {
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

  it("full lifecycle: ordered → scheduled → imaging_done → report_written → completed", async () => {
    const statusFlow = ["ordered", "scheduled", "imaging_done", "report_written", "completed"];
    let currentStatus = "ordered";

    for (const nextStatus of statusFlow.slice(1)) {
      mockSupabase._state.singleResult = { status: currentStatus };
      mockSupabase._state.errorResult = null;

      await service.transitionStatus("clinic-1", "order-1", nextStatus, "user-1");

      expect(mockSupabase._state.updateData).toEqual(
        expect.objectContaining({ status: nextStatus })
      );

      if (nextStatus === "imaging_done") {
        expect(mockSupabase._state.updateData.performed_at).toBeDefined();
      }
      if (nextStatus === "completed") {
        expect(mockSupabase._state.updateData.completed_at).toBeDefined();
      }

      currentStatus = nextStatus;
    }
  });

  it("cancellation is allowed from any non-terminal state", async () => {
    const cancellableStates = ["ordered", "scheduled", "imaging_done", "report_written"];

    for (const status of cancellableStates) {
      vi.clearAllMocks();
      mockSupabase._state.singleResult = { status };
      mockSupabase._state.errorResult = null;

      await service.transitionStatus("clinic-1", "order-1", "cancelled", "user-1");
      expect(mockSupabase._state.updateData.status).toBe("cancelled");
    }
  });

  it("cannot cancel from completed state", async () => {
    mockSupabase._state.singleResult = { status: "completed" };
    mockSupabase._state.errorResult = null;

    await expect(
      service.transitionStatus("clinic-1", "order-1", "cancelled", "user-1")
    ).rejects.toThrow('Cannot transition from "completed" to "cancelled"');
  });

  it("create order sets initial status to ordered", async () => {
    mockSupabase._state.singleResult = { id: "order-new" };
    mockSupabase._state.errorResult = null;

    const order = await service.createOrder("clinic-1", {
      patient_id: "p-1",
      modality: "ultrasound",
      body_part: "Abdomen",
      clinical_indication: "Right upper quadrant pain",
    }, "doctor-1");

    expect(order.id).toBe("order-new");
    expect(mockSupabase._state.insertData.status).toBe("ordered");
    expect(mockSupabase._state.insertData.modality).toBe("ultrasound");
  });

  it("upload image uses private bucket signed URL", async () => {
    mockSupabase._state.singleResult = { id: "img-1" };
    mockSupabase._state.errorResult = null;

    const img = await service.uploadImage("clinic-1", "order-1", {
      name: "ultrasound.png",
      size: 500000,
      type: "image/png",
    }, "technician-1");

    expect(img.id).toBe("img-1");
    const fileUrl = mockSupabase._state.insertData.file_url;
    expect(fileUrl).toContain("signed");
  });

  it("saveReport creates report and transitions order status", async () => {
    const tableCallCounts = {};
    mockSupabase.from.mockImplementation(function (table) {
      tableCallCounts[table] = (tableCallCounts[table] || 0) + 1;
      const tc = tableCallCounts[table];

      if (table === "radiology_reports" && tc === 1) {
        mockSupabase._state.singleResult = null;
      } else if (table === "radiology_reports" && tc === 2) {
        mockSupabase._state.singleResult = { id: "report-1" };
      } else if (table === "radiology_orders" && tc === 1) {
        mockSupabase._state.singleResult = { status: "imaging_done" };
      }
      return mockSupabase._chain;
    });
    mockSupabase._state.errorResult = null;

    const reportId = await service.saveReport("clinic-1", "order-1", {
      findings: "Clear lung fields bilaterally. No consolidation.",
      impression: "Normal chest X-ray.",
      status: "final",
    }, "radiologist-1");

    expect(reportId).toBe("report-1");
    expect(mockSupabase._state.updateData.status).toBe("report_written");
  });

  it("getStats counts orders by status", async () => {
    mockSupabase._state.multiResult = [
      { status: "ordered", modality: "xray" },
      { status: "ordered", modality: "xray" },
      { status: "scheduled", modality: "ct" },
      { status: "completed", modality: "mri" },
      { status: "completed", modality: "xray" },
    ];
    mockSupabase._state.errorResult = null;

    const stats = await service.getStats("clinic-1");

    expect(stats.total).toBe(5);
    expect(stats.ordered).toBe(2);
    expect(stats.scheduled).toBe(1);
    expect(stats.completed).toBe(2);
    expect(stats.byModality.xray).toBe(3);
    expect(stats.byModality.ct).toBe(1);
    expect(stats.byModality.mri).toBe(1);
  });
});
