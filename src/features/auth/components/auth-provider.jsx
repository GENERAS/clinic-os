"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
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
async function loadUserData() {
    const supabase = createClient();
    if (!supabase)
        return null;
    const { data, error } = await supabase.rpc("get_user_context");
    if (error || !data || data.error) {
        console.error("[AuthProvider] loadUserData failed:", error || data?.error);
        return null;
    }
    const u = data.user_data;
    const c = data.clinic_data;
    return {
        user: {
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            phone: u.phone,
            avatarUrl: u.avatar_url,
            clinicId: u.clinic_id,
        },
        clinic: c ? {
            id: c.id,
            name: c.name ?? "",
            slug: c.slug ?? "",
            onboarding_completed: c.onboarding_completed ?? false,
        } : null,
        roles: data.roles ?? [],
        permissions: data.permissions ?? [],
        clinicId: u.clinic_id,
        isSuperAdmin: !!u.is_super_admin,
    };
}
export function AuthProvider({ children }) {
    const [state, setState] = useState(initialAuthState);
    const refresh = useCallback(async () => {
        try {
            const supabaseUser = await authService.getCurrentUser();
            if (!supabaseUser) {
                setState({ ...initialAuthState, isLoading: false });
                return;
            }
            const userData = await loadUserData();
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
                    loadUserData().then((userData) => {
                        if (userData) {
                            sb.rpc("update_last_login").then(() => {
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
                const userData = await loadUserData();
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
