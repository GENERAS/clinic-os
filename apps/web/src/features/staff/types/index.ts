import type { User, Role, Permission } from "@/types/database"

export type StaffMember = User & {
  roles: Role[]
  permissions: Permission[]
}

export interface StaffInvitationView {
  id: string
  email: string
  role_name: string
  status: "pending" | "accepted" | "expired" | "cancelled"
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export type StaffStatus = "active" | "inactive" | "suspended"
