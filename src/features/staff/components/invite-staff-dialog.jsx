"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, UserPlus } from "lucide-react";
import { inviteStaffSchema } from "../schemas/staff.schema";
export function InviteStaffDialog({ open, onClose, onInvite, roles }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        resolver: zodResolver(inviteStaffSchema),
    });
    if (!open)
        return null;
    const onSubmit = async (values) => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await onInvite(values);
            setSuccess(true);
            reset();
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send invitation");
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5"/>
            <h2 className="text-lg font-semibold">Invite Staff</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1 hover:bg-muted">
            <X className="size-5"/>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email Address
            </label>
            <input id="email" type="email" placeholder="colleague@clinic.com" {...register("email")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium">
              Role
            </label>
            <select id="role" {...register("role_id")} disabled={saving || roles.length === 0} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60">
              <option value="">Select a role</option>
              {roles.map((role) => (<option key={role.id} value={role.id}>
                  {role.name}
                </option>))}
            </select>
            {errors.role_id && <p className="mt-1 text-xs text-destructive">{errors.role_id.message}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && (<p className="text-sm text-green-600">Invitation sent successfully</p>)}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin"/>}
              {saving ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
