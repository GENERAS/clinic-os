import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, resetMockState } from "@/test/setup";

describe("BillingService (Round 1 + 3 + 5 fixes)", () => {
  let mockSupabase;
  let service;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
    const mod = await import("@/features/billing/services/billing.service");
    service = new mod.BillingService(mockSupabase);
  });

  describe("getInvoicesForConsultation joins patients (Round 3 fix)", () => {
    it("includes patients in select query", async () => {
      mockSupabase._state.multiResult = [];
      await service.getInvoicesForConsultation("clinic-1", "consult-1");

      const selectCols = mockSupabase._state.selectColumns;
      expect(selectCols).toContain("patients");
      expect(selectCols).toContain("billing_line_items");
      expect(selectCols).toContain("patient_payments");
    });
  });

  describe("getInvoices uses clinic-scoped filters", () => {
    it("filters by clinic_id", async () => {
      mockSupabase._state.multiResult = [];
      await service.getInvoices("clinic-1");

      expect(mockSupabase._state.eqFilters.clinic_id).toBe("clinic-1");
    });

    it("applies status filter when provided", async () => {
      mockSupabase._state.multiResult = [];
      await service.getInvoices("clinic-1", { status: "paid" });

      expect(mockSupabase._state.eqFilters.status).toBe("paid");
    });
  });

  describe("createInvoice", () => {
    it("generates invoice number via RPC", async () => {
      mockSupabase._state.rpcResult = "INV-00001";
      mockSupabase._state.singleResult = { id: "inv-1" };
      mockSupabase._state.errorResult = null;

      const id = await service.createInvoice("clinic-1", {
        patient_id: "p-1",
        subtotal: 5000,
        tax: 900,
        total: 5900,
        items: [],
      }, "user-1");

      expect(id).toBe("inv-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("billing_invoices");
      expect(mockSupabase._state.rpc).toBeDefined;
      expect(mockSupabase.rpc).toHaveBeenCalledWith("generate_billing_invoice_number");
    });

    it("sets created_by to userId", async () => {
      mockSupabase._state.rpcResult = "INV-00002";
      mockSupabase._state.singleResult = { id: "inv-2" };
      mockSupabase._state.errorResult = null;

      await service.createInvoice("clinic-1", {
        patient_id: "p-1",
        items: [],
      }, "doctor-user-id");

      expect(mockSupabase._state.insertData.created_by).toBe("doctor-user-id");
    });
  });

  describe("recordPayment", () => {
    it("inserts payment with correct fields", async () => {
      mockSupabase._state.singleResult = { id: "pay-1" };
      mockSupabase._state.errorResult = null;

      let capturedInsert = null;
      const origFrom = mockSupabase.from.getMockImplementation();
      mockSupabase.from.mockImplementation(function (table) {
        if (table === "patient_payments") {
          const result = origFrom.call(this, table);
          const origInsert = result.insert;
          result.insert = vi.fn(function (data) {
            capturedInsert = data;
            return origInsert.call(this, data);
          });
          return result;
        }
        if (table === "billing_invoices") {
          mockSupabase._state.singleResult = { total: 5900 };
        }
        if (table === "patient_payments") {
          mockSupabase._state.multiResult = [{ amount: 5900 }];
        }
        return origFrom.call(this, table);
      });

      await service.recordPayment("clinic-1", {
        invoice_id: "inv-1",
        patient_id: "p-1",
        amount: 5900,
        payment_method: "cash",
      }, "user-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("patient_payments");
      expect(capturedInsert.amount).toBe(5900);
      expect(capturedInsert.payment_method).toBe("cash");
    });
  });

  describe("getDailyPayments uses date string (Round 5 fix)", () => {
    it("uses YYYY-MM-DD format for payment_date filters", async () => {
      mockSupabase._state.multiResult = [];
      await service.getDailyPayments("clinic-1");

      const gte = mockSupabase._state.gteFilters.payment_date;
      const lte = mockSupabase._state.lteFilters.payment_date;

      expect(gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(lte).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59$/);
    });
  });

  describe("getFinancialSummary uses date filters", () => {
    it("passes date strings to gte/lte", async () => {
      mockSupabase._state.multiResult = [];
      mockSupabase._chain._chainCallLog.length = 0;

      await service.getFinancialSummary("clinic-1", "2026-07-01", "2026-07-13T23:59:59");

      const gteCalls = mockSupabase._chain._chainCallLog.filter(c => c.op === "gte");
      const lteCalls = mockSupabase._chain._chainCallLog.filter(c => c.op === "lte");

      const gteCreatedAt = gteCalls.find(c => c.col === "created_at");
      const lteCreatedAt = lteCalls.find(c => c.col === "created_at");

      expect(gteCreatedAt?.val).toBe("2026-07-01");
      expect(lteCreatedAt?.val).toBe("2026-07-13T23:59:59");
    });
  });

  describe("searchPatientsWithOutstanding", () => {
    it("returns patients with unpaid invoices", async () => {
      const callCount = { n: 0 };
      mockSupabase.from.mockImplementation(function (table) {
        callCount.n++;
        if (callCount.n === 1) {
          mockSupabase._state.multiResult = [{ id: "p-1", full_name: "John Doe", phone: "0788000000" }];
        } else if (callCount.n === 2) {
          mockSupabase._state.multiResult = [{ id: "inv-1", invoice_number: "INV-001", created_at: "2026-07-01", total: "10000", status: "issued", patient_id: "p-1" }];
        } else {
          mockSupabase._state.multiResult = [];
        }
        return mockSupabase._chain;
      });

      const results = await service.searchPatientsWithOutstanding("clinic-1", "John");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].full_name).toBe("John Doe");
      expect(results[0].outstanding_total).toBe(10000);
    });
  });
});
