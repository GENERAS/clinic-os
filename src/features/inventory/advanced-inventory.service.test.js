import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, resetMockState } from "@/test/setup";

describe("AdvancedInventoryService (Round 1 regression - table names)", () => {
  let mockSupabase;
  let service;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
    vi.doMock("@/services/database/audit.service", () => ({
      getAuditService: () => ({ log: vi.fn().mockResolvedValue({}) }),
    }));
    const mod = await import("@/features/inventory/services/advanced-inventory.service");
    service = new mod.AdvancedInventoryService(mockSupabase);
  });

  describe("getSuppliers queries 'suppliers' table (not 'inventory_suppliers')", () => {
    it("uses correct table name", async () => {
      mockSupabase._state.multiResult = [];
      await service.getSuppliers("clinic-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("suppliers");
    });
  });

  describe("getSupplierItems queries 'supplier_items' table (not 'inventory_supplier_items')", () => {
    it("uses correct table name", async () => {
      mockSupabase._state.multiResult = [];
      await service.getSupplierItems("supplier-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("supplier_items");
    });
  });

  describe("linkSupplierItem uses unit_price (not unit_cost)", () => {
    it("inserts unit_price field", async () => {
      mockSupabase._state.singleResult = { id: "link-1" };
      mockSupabase._state.errorResult = null;
      await service.linkSupplierItem("supplier-1", "item-1", { unit_price: 5000 });
      expect(mockSupabase._state.insertData.unit_price).toBe(5000);
      expect(mockSupabase._state.insertData).not.toHaveProperty("unit_cost");
    });
  });

  describe("createPurchaseOrder generates order_number", () => {
    it("includes order_number in insert", async () => {
      mockSupabase._state.singleResult = { id: "po-1" };
      mockSupabase._state.errorResult = null;
      await service.createPurchaseOrder("clinic-1", "supplier-1", [], "user-1");
      expect(mockSupabase._state.insertData.order_number).toBeDefined();
      expect(mockSupabase._state.insertData.order_number).toMatch(/^PO-/);
    });
  });

  describe("receivePurchaseOrder uses received_date (not received_at)", () => {
    it("updates with received_date field", async () => {
      mockSupabase._state.singleResult = { id: "po-1", order_number: "PO-001" };
      mockSupabase._state.multiResult = [];
      mockSupabase._state.errorResult = null;

      // Mock inventory_items queries
      mockSupabase._state.singleResult = { current_stock: 100 };
      mockSupabase._state.errorResult = null;

      await service.receivePurchaseOrder("clinic-1", "po-1", [{ inventory_item_id: "item-1", quantity: 50 }], "user-1");

      // The final update on purchase_orders should use received_date
      expect(mockSupabase._state.updateData).toHaveProperty("received_date");
      expect(mockSupabase._state.updateData).not.toHaveProperty("received_at");
    });
  });

  describe("createStockTransfer uses source_clinic_id/destination_clinic_id (not from_location/to_location)", () => {
    it("inserts correct column names", async () => {
      mockSupabase._state.singleResult = { id: "transfer-1" };
      mockSupabase._state.errorResult = null;

      await service.createStockTransfer("clinic-1", {
        inventory_item_id: "item-1",
        quantity: 10,
        reason: "Restocking",
      }, "user-1");

      const data = mockSupabase._state.insertData;
      expect(data).toHaveProperty("source_clinic_id");
      expect(data).toHaveProperty("destination_clinic_id");
      expect(data).toHaveProperty("reason");
      expect(data).not.toHaveProperty("from_location");
      expect(data).not.toHaveProperty("to_location");
      expect(data).toHaveProperty("requested_by", "user-1");
    });
  });

  describe("getReorderSuggestions uses string date (not toISOString)", () => {
    it("passes a YYYY-MM-DD string to gte filter", async () => {
      mockSupabase._chain._chainCallLog.length = 0;

      await service.getReorderSuggestions("clinic-1");

      const gteCalls = mockSupabase._chain._chainCallLog.filter(c => c.op === "gte");
      const gteCreated = gteCalls.find(c => c.col === "created_at");

      expect(gteCreated).toBeDefined();
      expect(gteCreated.val).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(gteCreated.val).not.toContain("T");
    });
  });
});
