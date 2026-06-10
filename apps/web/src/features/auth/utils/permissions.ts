import type { AuthRole } from "../types"

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission)
}

export function hasRole(roles: AuthRole[], roleName: string): boolean {
  return roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase())
}

export function hasAnyRole(roles: AuthRole[], roleNames: string[]): boolean {
  return roleNames.some((name) => hasRole(roles, name))
}

export function can(permissions: string[], permission: string): boolean {
  return hasPermission(permissions, permission)
}

export function canAll(permissions: string[], required: string[]): boolean {
  return required.every((p) => permissions.includes(p))
}

export function canAny(permissions: string[], required: string[]): boolean {
  return required.some((p) => permissions.includes(p))
}
