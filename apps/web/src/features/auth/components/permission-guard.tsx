"use client"

import { useAuth } from "../hooks/use-auth"
import { can } from "../utils/permissions"

interface PermissionGuardProps {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const { permissions, isLoading } = useAuth()

  if (isLoading) return null
  if (!can(permissions, permission)) return <>{fallback}</>
  return <>{children}</>
}
