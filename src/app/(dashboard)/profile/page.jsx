"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Loader2, Camera } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { authService } from "@/features/auth/services/auth.service";
import { profileSchema, passwordSchema } from "@/features/auth/schemas";
import { toast } from "sonner";
export default function ProfilePage() {
    const { user, clinic, roles, refresh } = useAuth();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploading, setUploading] = useState(false);
    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        values: {
            full_name: user?.fullName || "",
            phone: user?.phone || "",
        },
    });
    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: { current_password: "", new_password: "", confirm_password: "" },
    });
    const handleProfileSubmit = async (values) => {
        if (!user)
            return;
        setSavingProfile(true);
        try {
            await authService.updateProfile(user.id, values);
            await refresh();
            toast.success("Profile updated");
        }
        catch {
            toast.error("Failed to update profile");
        }
        finally {
            setSavingProfile(false);
        }
    };
    const handlePasswordSubmit = async (values) => {
        if (!user)
            return;
        setSavingPassword(true);
        try {
            await authService.updatePassword(values.new_password);
            passwordForm.reset({ current_password: "", new_password: "", confirm_password: "" });
            toast.success("Password updated");
        }
        catch {
            toast.error("Failed to update password");
        }
        finally {
            setSavingPassword(false);
        }
    };
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user)
            return;
        setUploading(true);
        try {
            const url = await authService.uploadAvatar(user.id, file);
            await refresh();
            toast.success("Avatar updated");
        }
        catch {
            toast.error("Failed to upload avatar");
        }
        finally {
            setUploading(false);
        }
    };
    if (!user)
        return null;
    return (<div className="max-w-2xl space-y-6">
        <PageHeader title="Profile" description="Manage your account"/>

        {/* Profile Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                {user.avatarUrl ? (<img src={user.avatarUrl} alt="" className="size-full object-cover"/>) : (<User className="size-8 text-muted-foreground"/>)}
              </div>
              <label className="absolute bottom-0 right-0 flex size-7 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted">
                <Camera className="size-3.5"/>
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploading}/>
              </label>
              {uploading && (<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white"/>
                </div>)}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((r) => (<span key={r.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {r.name}
                  </span>))}
              </div>
              {clinic && (<p className="mt-2 text-xs text-muted-foreground">{clinic.name}</p>)}
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Edit Profile</h3>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input {...profileForm.register("full_name")} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"/>
              {profileForm.formState.errors.full_name && (<p className="mt-1 text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>)}
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input value={user.email} disabled className="mt-1 block w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"/>
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input {...profileForm.register("phone")} placeholder="+1234567890" className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"/>
              {profileForm.formState.errors.phone && (<p className="mt-1 text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>)}
            </div>
            <button type="submit" disabled={savingProfile} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Change Password</h3>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <input type="password" {...passwordForm.register("current_password")} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"/>
              {passwordForm.formState.errors.current_password && (<p className="mt-1 text-xs text-destructive">{passwordForm.formState.errors.current_password.message}</p>)}
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <input type="password" {...passwordForm.register("new_password")} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"/>
              {passwordForm.formState.errors.new_password && (<p className="mt-1 text-xs text-destructive">{passwordForm.formState.errors.new_password.message}</p>)}
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <input type="password" {...passwordForm.register("confirm_password")} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"/>
              {passwordForm.formState.errors.confirm_password && (<p className="mt-1 text-xs text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>)}
            </div>
            <button type="submit" disabled={savingPassword} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>);
}
