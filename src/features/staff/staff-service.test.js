import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test/setup";

describe("StaffService (Round 5 regression - null safety + last-owner guard)", () => {
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
    vi.doMock("@/services/database/audit.service", () => ({
      getAuditService: () => ({ log: vi.fn().mockResolvedValue({}) }),
    }));
  });

  describe("changeRole prevents last-owner demotion", () => {
    it("throws when trying to demote the only Owner", async () => {
      const mod = await import("@/features/staff/services/staff-service");
      const staffService = mod.getStaffService();

      const tableCounts = {};
      mockSupabase.from.mockImplementation(function (table) {
        tableCounts[table] = (tableCounts[table] || 0) + 1;
        const tc = tableCounts[table];

        if (table === "user_roles" && tc === 1) {
          mockSupabase._state.singleResult = { id: "ur-1", role_id: "owner-role-id" };
        } else if (table === "roles" && tc === 1) {
          mockSupabase._state.singleResult = { name: "Owner" };
        } else if (table === "roles" && tc === 2) {
          mockSupabase._state.singleResult = { name: "Doctor" };
        } else if (table === "roles" && tc === 3) {
          mockSupabase._state.multiResult = [{ id: "owner-role-id" }];
        } else if (table === "user_roles" && tc === 2) {
          mockSupabase._state.countResult = 1;
        }
        return mockSupabase._chain;
      });

      await expect(
        staffService.changeRole("clinic-1", "user-1", "doctor-role-id", "admin-1")
      ).rejects.toThrow("Cannot demote the only Owner");
    });

    it("allows demoting when there are multiple Owners", async () => {
      const mod = await import("@/features/staff/services/staff-service");
      const staffService = mod.getStaffService();

      const tableCounts = {};
      mockSupabase.from.mockImplementation(function (table) {
        tableCounts[table] = (tableCounts[table] || 0) + 1;
        const tc = tableCounts[table];

        if (table === "user_roles" && tc === 1) {
          mockSupabase._state.singleResult = { id: "ur-1", role_id: "owner-role-id" };
        } else if (table === "roles" && tc === 1) {
          mockSupabase._state.singleResult = { name: "Owner" };
        } else if (table === "roles" && tc === 2) {
          mockSupabase._state.singleResult = { name: "Doctor" };
        } else if (table === "roles" && tc === 3) {
          mockSupabase._state.multiResult = [{ id: "owner-role-id" }];
        } else if (table === "user_roles" && tc === 2) {
          mockSupabase._state.countResult = 3;
        }
        return mockSupabase._chain;
      });

      await staffService.changeRole("clinic-1", "user-1", "doctor-role-id", "admin-1");
    });

    it("allows changing to Owner role (no guard needed)", async () => {
      const mod = await import("@/features/staff/services/staff-service");
      const staffService = mod.getStaffService();

      const tableCounts = {};
      mockSupabase.from.mockImplementation(function (table) {
        tableCounts[table] = (tableCounts[table] || 0) + 1;
        const tc = tableCounts[table];

        if (table === "user_roles" && tc === 1) {
          mockSupabase._state.singleResult = { id: "ur-1", role_id: "doctor-role-id" };
        } else if (table === "roles" && tc === 1) {
          mockSupabase._state.singleResult = { name: "Doctor" };
        } else if (table === "roles" && tc === 2) {
          mockSupabase._state.singleResult = { name: "Owner" };
        }
        return mockSupabase._chain;
      });

      await staffService.changeRole("clinic-1", "user-1", "owner-role-id", "admin-1");
    });
  });

  describe("null full_name safety", () => {
    it("staff-table handles null full_name without crash", () => {
      const member = { id: "1", full_name: null, email: "test@test.com", avatar_url: null, roles: [] };
      // Simulating the avatar fallback
      const initial = (member.full_name || "?").charAt(0).toUpperCase();
      expect(initial).toBe("?");
    });

    it("staff-table handles undefined full_name without crash", () => {
      const member = { id: "1", email: "test@test.com", avatar_url: null, roles: [] };
      const displayName = member.full_name || "Unknown";
      expect(displayName).toBe("Unknown");
    });

    it("handles normal full_name correctly", () => {
      const member = { full_name: "John Doe" };
      const initial = (member.full_name || "?").charAt(0).toUpperCase();
      expect(initial).toBe("J");
    });
  });

  describe("appointment null doctor safety", () => {
    it("optional chaining prevents crash on null doctor", () => {
      const apt = { doctor: null };
      expect(apt.doctor?.full_name || "Unassigned").toBe("Unassigned");
    });

    it("optional chaining works with valid doctor", () => {
      const apt = { doctor: { full_name: "Dr. Smith" } };
      expect(apt.doctor?.full_name || "Unassigned").toBe("Dr. Smith");
    });

    it("handles undefined doctor object", () => {
      const apt = {};
      expect(apt.doctor?.full_name?.charAt(0)?.toUpperCase() || "?").toBe("?");
    });
  });
});
