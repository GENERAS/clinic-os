"use client";
import { useAuth } from "../hooks/use-auth";
import { hasRole } from "../utils/permissions";
export function RoleGuard({ role, fallback = null, children }) {
    const { roles, isLoading } = useAuth();
    if (isLoading)
        return null;
    if (!hasRole(roles, role))
        return <>{fallback}</>;
    return <>{children}</>;
}
