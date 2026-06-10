"use client"

import { createContext, useCallback, useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import { authService } from "../services/auth.service"
import type { AuthState, AuthUser, AuthClinic, AuthRole } from "../types"

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const initialAuthState: AuthState = {
  user: null,
  clinic: null,
  roles: [],
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function loadUserData(supabaseUserId: string) {
  const supabase = createClient()

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*, clinics!inner(id, name, slug)")
    .eq("id", supabaseUserId)
    .single()

  if (userError || !userData) return null

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(id, name)")
    .eq("user_id", supabaseUserId)

  const roles: AuthRole[] =
    (roleRows?.map((r: Record<string, unknown>) => {
      const roleData = r.roles as { id: string; name: string }
      return { id: roleData.id, name: roleData.name }
    }) as AuthRole[]) ?? []

  const { data: permissionRows } = await supabase
    .from("role_permissions")
    .select("permissions(name)")
    .in(
      "role_id",
      roles.map((r) => r.id)
    )

  const permissions: string[] = [
    ...new Set(
      (permissionRows?.map(
        (p: Record<string, unknown>) => (p.permissions as { name: string }).name
      ) ?? [])
    ),
  ]

  const clinicData = userData.clinics as unknown as AuthClinic

  return {
    user: {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      phone: userData.phone,
      avatarUrl: userData.avatar_url,
      clinicId: userData.clinic_id,
    },
    clinic: {
      id: clinicData.id ?? userData.clinic_id,
      name: clinicData.name ?? "",
      slug: clinicData.slug ?? "",
    },
    roles,
    permissions,
    clinicId: userData.clinic_id,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState)
  const router = useRouter()
  const hasLoggedLogin = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const supabaseUser = await authService.getCurrentUser()
      if (!supabaseUser) {
        setState({ ...initialAuthState, isLoading: false })
        return
      }

      const userData = await loadUserData(supabaseUser.id)
      if (!userData) {
        setState({ ...initialAuthState, isLoading: false })
        return
      }

      if (!hasLoggedLogin.current) {
        hasLoggedLogin.current = true

        const sb = createClient()
        try {
          await sb
            .from("users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", userData.user.id)
        } catch {
          // non-blocking
        }

        getAuditService()
          .log({
            clinic_id: userData.clinicId,
            user_id: userData.user.id,
            action: "login",
            entity_type: "session",
            new_value: { email: userData.user.email },
          })
          .catch(() => {})
      }

      setState({
        user: userData.user,
        clinic: userData.clinic,
        roles: userData.roles,
        permissions: userData.permissions,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch {
      setState({ ...initialAuthState, isLoading: false })
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hasLoggedLogin.current = false
        await refresh()
        router.refresh()
      } else if (event === "SIGNED_OUT") {
        hasLoggedLogin.current = false
        setState({ ...initialAuthState, isLoading: false })
        router.refresh()
      }
    })

    refresh()

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh, router])

  const login = useCallback(async (email: string, password: string) => {
    await authService.login({ email, password })
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionUser = sessionData.session?.user

    if (sessionUser) {
      const userData = await loadUserData(sessionUser.id)
      if (userData) {
        getAuditService()
          .log({
            clinic_id: userData.clinicId,
            user_id: userData.user.id,
            action: "logout",
            entity_type: "session",
            old_value: { email: userData.user.email },
          })
          .catch(() => {})
      }
    }

    await authService.logout()
    setState({ ...initialAuthState, isLoading: false })
    router.push("/login")
  }, [router])

  const value = useMemo(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
