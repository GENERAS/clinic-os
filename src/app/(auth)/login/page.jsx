"use client";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Hospital, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema } from "@/features/auth/schemas";
import { authService } from "@/features/auth/services/auth.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { handleApiError } from "@/lib/errors";
export default function LoginPage() {
    const navigate = useNavigate();
    const { isLoading, isAuthenticated } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/dashboard", { replace: true });
        }
    }, [isLoading, isAuthenticated, navigate]);
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(loginSchema),
    });
    async function onSubmit(data) {
        setError(null);
        try {
            await authService.login(data);
        }
        catch (err) {
            setError(handleApiError(err, "Invalid email or password"));
        }
    }
    if (isLoading)
        return (<div className="flex justify-center py-16">
        <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent"/>
      </div>);
    return (<div className="w-full max-w-sm mx-auto">
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-xl mb-3">
            <Hospital className="size-5 text-primary"/>
          </div>
          <h1 className="text-lg font-semibold">Sign in to ClinicOS</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Enter your credentials</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (<div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs font-medium">
              {error}
            </div>)}

          <div>
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input id="email" type="email" autoComplete="email" className="mt-1 flex h-9 w-full rounded-lg border border-border/80 bg-background px-3 py-1 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="you@clinic.com" {...register("email")}/>
            {errors.email && (<p className="text-destructive mt-1 text-xs">{errors.email.message}</p>)}
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1">
              <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="flex h-9 w-full rounded-lg border border-border/80 bg-background px-3 py-1 pr-9 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="••••••••" {...register("password")}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2" tabIndex={-1}>
                {showPassword ? <EyeOff className="size-3.5"/> : <Eye className="size-3.5"/>}
              </button>
            </div>
            {errors.password && (<p className="text-destructive mt-1 text-xs">{errors.password.message}</p>)}
          </div>

          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50">
            {isSubmitting && <div className="border-primary-foreground size-3.5 animate-spin rounded-full border-2 border-t-transparent"/>}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-center text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>);
}
