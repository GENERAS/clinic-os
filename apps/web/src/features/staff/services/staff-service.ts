import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import { randomUUID } from "crypto"
import type { User, Role, Permission, StaffInvitation } from "@/types/database"
import type { StaffMember } from "../types"

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function getStaffService() {
  const supabase = createClient()
  const audit = getAuditService()

  return {
    async getStaff(clinicId: string): Promise<StaffMember[]> {
      const { data: users, error } = await supabase
        .from("users")
        .select("*, user_roles!inner(roles(id, name)), created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
      if (error) throw error

      return (users || []).map((u: Record<string, unknown>) => {
        const userRoles = (u.user_roles as { roles: { id: string; name: string } }[]) || []
        return {
          ...u,
          roles: userRoles.map((ur) => ur.roles),
          permissions: [],
        } as unknown as StaffMember
      })
    },

    async getStaffById(clinicId: string, userId: string): Promise<StaffMember | null> {
      const { data: user, error } = await supabase
        .from("users")
        .select("*, user_roles!inner(roles(id, name))")
        .eq("id", userId)
        .eq("clinic_id", clinicId)
        .single()
      if (error) return null

      const userRoles = (user.user_roles as { roles: { id: string; name: string } }[]) || []
      const roles = userRoles.map((ur) => ur.roles as Role)

      const roleIds = roles.map((r) => r.id)
      let permissions: Permission[] = []
      if (roleIds.length > 0) {
        const { data: permData } = await supabase
          .from("role_permissions")
          .select("permissions(id, name, description)")
          .in("role_id", roleIds)
        permissions = (permData || []).map(
          (rp: Record<string, unknown>) => (rp.permissions as Permission)
        ).filter(Boolean)
      }

      return { ...user, roles, permissions } as unknown as StaffMember
    },

    async inviteStaff(clinicId: string, email: string, roleId: string, invitedByUserId: string): Promise<StaffInvitation> {
      const token = generateToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from("staff_invitations")
        .insert({
          clinic_id: clinicId,
          email,
          role_id: roleId,
          token,
          expires_at: expiresAt,
        })
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: invitedByUserId,
        action: "invitation sent",
        entity_type: "staff_invitations",
        entity_id: data.id,
        new_value: { email, role_id: roleId, expires_at: expiresAt },
      }).catch(() => {})

      return data as StaffInvitation
    },

    async getInvitations(clinicId: string): Promise<StaffInvitationView[]> {
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*, roles!inner(name)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
      if (error) throw error

      return (data || []).map((inv: Record<string, unknown>) => ({
        id: inv.id as string,
        email: inv.email as string,
        role_name: (inv.roles as { name: string }).name,
        status: inv.status as StaffInvitationView["status"],
        created_at: inv.created_at as string,
        expires_at: inv.expires_at as string,
        accepted_at: inv.accepted_at as string | null,
      }))
    },

    async cancelInvitation(clinicId: string, invitationId: string, userId: string): Promise<void> {
      const { error } = await supabase
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId)
        .eq("clinic_id", clinicId)
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "invitation cancelled",
        entity_type: "staff_invitations",
        entity_id: invitationId,
      }).catch(() => {})
    },

    async updateStaff(clinicId: string, staffId: string, values: Partial<User>, userId: string): Promise<User> {
      const { data, error } = await supabase
        .from("users")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", staffId)
        .eq("clinic_id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "staff updated",
        entity_type: "users",
        entity_id: staffId,
        new_value: values,
      }).catch(() => {})

      return data as User
    },

    async changeRole(clinicId: string, staffId: string, roleId: string, userId: string): Promise<void> {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id, role_id")
        .eq("user_id", staffId)
        .single()

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role_id: roleId })
          .eq("id", existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: staffId, role_id: roleId })
        if (error) throw error
      }

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "role changed",
        entity_type: "users",
        entity_id: staffId,
        old_value: existing ? { role_id: existing.role_id } : null,
        new_value: { role_id: roleId },
      }).catch(() => {})
    },

    async setStaffStatus(clinicId: string, staffId: string, status: string, userId: string): Promise<void> {
      await this.updateStaff(clinicId, staffId, { status: status as User["status"] }, userId)

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: `staff ${status === "active" ? "reactivated" : status === "suspended" ? "suspended" : "deactivated"}`,
        entity_type: "users",
        entity_id: staffId,
        new_value: { status },
      }).catch(() => {})
    },

    async removeStaff(clinicId: string, staffId: string, userId: string): Promise<void> {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("roles!inner(name)")
        .eq("user_id", staffId)

      const owners = roleRows?.filter(
        (r: Record<string, unknown>) => (r.roles as { name: string }).name === "Owner"
      ) || []

      if (owners.length > 0) {
        const { count } = await supabase
          .from("user_roles")
          .select("*, users!inner(id)", { count: "exact", head: true })
          .eq("roles.name", "Owner")
          .eq("users.clinic_id", clinicId) as unknown as { count: number }

        if (count <= 1) {
          throw new Error("Cannot remove the only Owner. Promote another user to Owner first.")
        }
      }

      const { error } = await supabase
        .from("users")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", staffId)
        .eq("clinic_id", clinicId)
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "staff removed",
        entity_type: "users",
        entity_id: staffId,
      }).catch(() => {})
    },

    async uploadAvatar(clinicId: string, staffId: string, file: File, userId: string): Promise<string> {
      const ext = file.name.split(".").pop()
      const filePath = `avatars/${staffId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("clinic-logos")
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("clinic-logos")
        .getPublicUrl(filePath)

      const avatarUrl = urlData.publicUrl
      await this.updateStaff(clinicId, staffId, { avatar_url: avatarUrl }, userId)
      return avatarUrl
    },

    async deleteAvatar(clinicId: string, staffId: string, userId: string): Promise<void> {
      await this.updateStaff(clinicId, staffId, { avatar_url: null }, userId)
    },
  }
}

interface StaffInvitationView {
  id: string
  email: string
  role_name: string
  status: "pending" | "accepted" | "expired" | "cancelled"
  created_at: string
  expires_at: string
  accepted_at: string | null
}
