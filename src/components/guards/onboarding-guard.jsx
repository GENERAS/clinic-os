"use client";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  );
}

export function OnboardingGuard() {
  const { isLoading, isAuthenticated, clinic } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/onboarding" replace />;
  if (clinic?.id) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
