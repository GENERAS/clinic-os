"use client"

import { useAuth } from "../hooks/use-auth"
import { hasRole } from "../utils/permissions"

interface RoleGuardProps {
  role: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ role, fallback = null, children }: RoleGuardProps) {
  const { roles, isLoading } = useAuth()

  if (isLoading) return null
  if (!hasRole(roles, role)) return <>{fallback}</>
  return <>{children}</>
}
