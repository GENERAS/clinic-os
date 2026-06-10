import type { Role } from "./role"
import type { Permission } from "./permission"

export interface User {
  id: string
  clinicId: string
  email: string
  name: string
  role: Role
  permissions: Permission[]
  avatar?: string
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
