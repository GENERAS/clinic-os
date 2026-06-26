"use client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Hospital, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { authService } from "@/features/auth/services/auth.service";
import { handleApiError } from "@/lib/errors";
export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
    });
    async function onSubmit(data) {
        setError(null);
        try {
            await authService.forgotPassword(data);
            setSent(true);
        }
        catch (err) {
            setError(handleApiError(err, "Something went wrong"));
        }
    }
    return (<div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground mb-3 flex size-10 items-center justify-center rounded-lg">
          <Hospital className="size-6"/>
        </div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {sent ? (<div className="flex flex-col items-center text-center">
          <CheckCircle2 className="text-primary mb-3 size-12"/>
          <p className="text-sm font-medium">Check your email</p>
          <p className="text-muted-foreground mt-1 text-sm">
            We&apos;ve sent a password reset link to your email.
          </p>
          <Link to="/login" className="text-primary mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4">
            <ArrowLeft className="size-3"/>
            Back to sign in
          </Link>
        </div>) : (<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (<div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
              {error}
            </div>)}

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input id="email" type="email" autoComplete="email" className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex h-9 w-full rounded-lg border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="you@clinic.com" {...register("email")}/>
            {errors.email && (<p className="text-destructive mt-1 text-xs">{errors.email.message}</p>)}
          </div>

          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50">
            {isSubmitting && <Loader2 className="size-4 animate-spin"/>}
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>

          <div className="text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4">
              <ArrowLeft className="size-3"/>
              Back to sign in
            </Link>
          </div>
        </form>)}
    </div>);
}
