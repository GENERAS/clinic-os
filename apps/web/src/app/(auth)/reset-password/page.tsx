"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Hospital, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { resetPasswordSchema, type ResetPasswordSchemaType } from "@/features/auth/schemas"
import { authService } from "@/features/auth/services/auth.service"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordSchemaType) {
    setError(null)
    try {
      await authService.resetPassword(data)
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground mb-3 flex size-10 items-center justify-center rounded-lg">
          <Hospital className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Set new password</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            New Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-lg border px-3 py-1 pr-9 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••••"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive mt-1 text-xs">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex h-9 w-full rounded-lg border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-destructive mt-1 text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>

        <div className="text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4"
          >
            <ArrowLeft className="size-3" />
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
