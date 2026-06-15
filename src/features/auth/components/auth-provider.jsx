"use client";
import { createContext, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { authService } from "../services/auth.service";
const LOAD_TIMEOUT_MS = 8000;
const initialAuthState = {
    user: null,
    clinic: null,
    roles: [],
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
    isSuperAdmin: false,
};
export const AuthContext = createContext(undefined);
async function loadUserData(supabaseUserId) {
    const supabase = createClient();
    if (!supabase)
        return null;
    const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name, phone, avatar_url, clinic_id, status, is_super_admin, last_login_at, created_at, updated_at")
        .eq("id", supabaseUserId)
        .single();
    if (userError) {
        console.error("[AuthProvider] loadUserData error:", userError.message, userError.details, userError.hint);
        return null;
    }
    if (!userData) {
        console.error("[AuthProvider] loadUserData: no user data returned");
        return null;
    }
    let clinicData = null;
    if (userData.clinic_id) {
        const { data: clinic } = await supabase
            .from("clinics")
            .select("id, name, slug")
            .eq("id", userData.clinic_id)
            .maybeSingle();
        clinicData = clinic;
    }
    const { data: roleRows } = await supabase
        .from("user_roles")
        .select("roles(id, name)")
        .eq("user_id", supabaseUserId);
    const roles = roleRows?.map((r) => {
        const roleData = r.roles;
        return { id: roleData.id, name: roleData.name };
    }) ?? [];
    const { data: permissionRows } = await supabase
        .from("role_permissions")
        .select("permissions(name)")
        .in("role_id", roles.map((r) => r.id));
    const permissions = [
        ...new Set((permissionRows?.map((p) => p.permissions.name) ?? [])),
    ];
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
        isSuperAdmin: !!userData.is_super_admin,
    };
}
export function AuthProvider({ children }) {
    const [state, setState] = useState(initialAuthState);
    const navigate = useNavigate();
    const refresh = useCallback(async () => {
        try {
            const supabaseUser = await authService.getCurrentUser();
            if (!supabaseUser) {
                setState({ ...initialAuthState, isLoading: false });
                return;
            }
            const userData = await loadUserData(supabaseUser.id);
            if (!userData) {
                setState({
                    user: { id: supabaseUser.id, email: supabaseUser.email, fullName: "", phone: "", avatarUrl: null, clinicId: null },
                    clinic: null,
                    roles: [],
                    permissions: [],
                    isLoading: false,
                    isAuthenticated: true,
                    isSuperAdmin: false,
                });
                return;
            }
            setState({
                user: userData.user,
                clinic: userData.clinic,
                roles: userData.roles,
                permissions: userData.permissions,
                isLoading: false,
                isAuthenticated: true,
                isSuperAdmin: userData.isSuperAdmin,
            });
        }
        catch {
            setState({ ...initialAuthState, isLoading: false });
        }
    }, []);
    useEffect(() => {
        const supabase = createClient();
        if (!supabase) {
            setState({ ...initialAuthState, isLoading: false });
            return;
        }
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                refresh().then(() => {
                    const sb = createClient();
                    authService.getCurrentUser().then((supabaseUser) => {
                        if (supabaseUser) {
                            loadUserData(supabaseUser.id).then((userData) => {
                                if (userData) {
                                    sb
                                        .from("users")
                                        .update({ last_login_at: new Date().toISOString() })
                                        .eq("id", userData.user.id)
                                        .then(() => {
                                            getAuditService()
                                                .log({
                                                    clinic_id: userData.clinicId,
                                                    user_id: userData.user.id,
                                                    action: "login",
                                                    entity_type: "session",
                                                    new_value: { email: userData.user.email },
                                                })
                                                .catch(() => { });
                                        });
                                }
                            });
                        }
                    });
                }).catch(() => { });
            }
            else if (event === "SIGNED_OUT") {
                setState({ ...initialAuthState, isLoading: false });
            }
            else if (event === "TOKEN_REFRESHED") {
                refresh();
            }
        });
        const timeoutId = setTimeout(() => {
            setState((prev) => (prev.isLoading ? { ...initialAuthState, isLoading: false } : prev));
        }, LOAD_TIMEOUT_MS);
        refresh();
        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [refresh]);
    const login = useCallback(async (email, password) => {
        await authService.login({ email, password });
    }, []);
    const logout = useCallback(async () => {
        const supabase = createClient();
        if (!supabase)
            return;
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (sessionUser) {
            try {
                const userData = await loadUserData(sessionUser.id);
                if (userData) {
                    getAuditService()
                        .log({
                        clinic_id: userData.clinicId,
                        user_id: userData.user.id,
                        action: "logout",
                        entity_type: "session",
                        old_value: { email: userData.user.email },
                    })
                        .catch(() => { });
                }
            }
            catch {
                // loadUserData failed — not critical, continue with signOut
            }
        }
        try {
            await authService.logout();
        }
        catch {
            // signOut failed — still clear client state below
        }
        setState({ ...initialAuthState, isLoading: false });
        window.location.href = "/login";
    }, []);
    const value = useMemo(() => ({ ...state, login, logout, refresh }), [state, login, logout, refresh]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
