"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Phone, Calendar, Clock, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { hasRole } from "@/features/auth/utils/permissions";
import { getStaffService } from "@/features/staff/services/staff-service";
import { StatusBadge } from "@/features/staff/components/status-badge";
import { RoleBadge } from "@/features/staff/components/role-badge";
import { createClient } from "@/lib/supabase/client";
import { handleApiError } from "@/lib/errors";
import { toast } from "sonner";
function formatDate(dateStr) {
    if (!dateStr)
        return "Never";
    return new Date(dateStr).toLocaleString();
}
export default function StaffDetailPage() {
    const { id } = useParams();
    const { user: authUser, clinic: authClinic, roles } = useAuth();
    const isOwner = hasRole(roles, "Owner");
    const isSelf = authUser?.id === id;
    const [member, setMember] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [rolesList, setRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
    const clinicId = authClinic?.id;
    const supabase = useMemo(() => createClient(), []);
    const staffService = useMemo(() => getStaffService(), []);
    const loadData = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const [data, allRoles] = await Promise.all([
                staffService.getStaffById(clinicId, id),
                staffService.getAllRoles(),
            ]);
            setMember(data);
            setRolesList(allRoles);
            if (data) {
                setEditForm({ full_name: data.full_name || "", phone: data.phone || "" });
            }
            const { data: logs } = await supabase
                .from("audit_logs")
                .select("*")
                .eq("clinic_id", clinicId)
                .or(`entity_id.eq.${id},user_id.eq.${id}`)
                .order("created_at", { ascending: false })
                .limit(20);
            setAuditLogs(logs || []);
        }
        catch (err) {
            toast.error(handleApiError(err, "Failed to load staff details"));
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, id, staffService, supabase]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    const handleRoleChange = async (roleId) => {
        if (!clinicId || !authUser || !id)
            return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await staffService.changeRole(clinicId, id, roleId, authUser.id);
            setSuccess("Role updated");
            await loadData();
        }
        catch (err) {
            setError(handleApiError(err, "Failed to update role"));
        }
        finally {
            setSaving(false);
        }
    };
    const handleStatusChange = async (newStatus) => {
        if (!clinicId || !authUser || !id)
            return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await staffService.setStaffStatus(clinicId, id, newStatus, authUser.id);
            setSuccess(`Staff ${newStatus}`);
            await loadData();
        }
        catch (err) {
            setError(handleApiError(err, "Failed to update status"));
        }
        finally {
            setSaving(false);
        }
    };
    const handleRemove = async () => {
        if (!clinicId || !authUser || !id)
            return;
        if (!confirm("Are you sure you want to remove this staff member?"))
            return;
        setSaving(true);
        setError(null);
        try {
            await staffService.removeStaff(clinicId, id, authUser.id);
            setSuccess("Staff removed");
            await loadData();
        }
        catch (err) {
            setError(handleApiError(err, "Failed to remove staff"));
        }
        finally {
            setSaving(false);
        }
    };
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !clinicId || !authUser)
            return;
        setSaving(true);
        try {
            await staffService.uploadAvatar(clinicId, id, file, authUser.id);
            await loadData();
        }
        catch {
            setError("Failed to upload avatar");
        }
        finally {
            setSaving(false);
        }
    };
    const handleAvatarDelete = async () => {
        if (!clinicId || !authUser)
            return;
        setSaving(true);
        try {
            await staffService.deleteAvatar(clinicId, id, authUser.id);
            await loadData();
        }
        catch {
            setError("Failed to delete avatar");
        }
        finally {
            setSaving(false);
        }
    };
    const handleProfileSave = async () => {
        if (!clinicId || !authUser || !id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await staffService.updateStaff(clinicId, id, {
                full_name: editForm.full_name,
                phone: editForm.phone,
            }, authUser.id);
            setSuccess("Profile updated");
            await loadData();
        } catch (err) {
            setError(handleApiError(err, "Failed to update profile"));
        } finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (!member) {
        return (<div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Staff member not found</p>
        <Link to="/settings/staff" className="text-sm text-primary hover:underline">
          Back to staff directory
        </Link>
      </div>);
    }
    return (<div className="space-y-6">
      <Link to="/settings/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4"/>
        Back to Staff
      </Link>

      <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="relative">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-medium">
              {member.avatar_url ? (<img src={member.avatar_url} alt={`${member.full_name}'s avatar`} className="size-20 rounded-full object-cover"/>) : (member.full_name.charAt(0).toUpperCase())}
            </div>
            {isOwner && isSelf && (<label className="absolute bottom-0 right-0 flex size-6 cursor-pointer items-center justify-center rounded-full border bg-background text-xs hover:bg-muted">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
                +
              </label>)}
          </div>
          {isOwner && member.avatar_url && (<button type="button" onClick={handleAvatarDelete} className="text-xs text-destructive hover:underline">
              Remove
            </button>)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">{member.full_name}</h1>
              <div className="mt-1 flex flex-wrap gap-1">
                {member.roles.map((role) => (<RoleBadge key={role.id} role={role.name}/>))}
                <StatusBadge status={member.status}/>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4"/>
              {member.email}
            </div>
            {member.phone && (<div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4"/>
                {member.phone}
              </div>)}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4"/>
              Joined {formatDate(member.created_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4"/>
              Last login {formatDate(member.last_login_at)}
            </div>
          </div>
        </div>
      </div>

      {error && (<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>)}
      {success && (<div className="rounded-lg border border-green-600/30 bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>)}

      {(isOwner || isSelf) && (<div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full Name</label>
              <input type="text" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input type="text" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" value={member.email} disabled className="w-full rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground"/>
            </div>
          </div>
          <button type="button" onClick={handleProfileSave} disabled={saving} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Save Changes
          </button>
        </div>)}

      {isOwner && !isSelf && (<div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">Manage Staff</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <select value={member.roles[0]?.id || ""} onChange={(e) => handleRoleChange(e.target.value)} disabled={saving} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">Change role...</option>
                {rolesList.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <div className="flex gap-2">
                {["active", "inactive", "suspended"].map((s) => (<button key={s} type="button" onClick={() => handleStatusChange(s)} disabled={saving || member.status === s} className="rounded-lg border bg-background px-3 py-2 text-sm capitalize hover:bg-muted disabled:opacity-50">
                    {s}
                  </button>))}
              </div>
            </div>

            <div className="flex items-end">
              <button type="button" onClick={handleRemove} disabled={saving} className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
                Remove from Clinic
              </button>
            </div>
          </div>
        </div>)}

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Shield className="size-4"/>
          Permissions
        </h2>
        {member.roles.map((role) => (<div key={role.id} className="space-y-2">
            <p className="text-sm font-medium">
              Role: <RoleBadge role={role.name}/>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.permissions.map((perm) => (<span key={perm.id} className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs">
                  {perm.name.replace(/_/g, " ")}
                </span>))}
              {member.permissions.length === 0 && (<p className="text-xs text-muted-foreground">No permissions data</p>)}
            </div>
          </div>))}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Recent Activity</h2>
        {auditLogs.length === 0 ? (<p className="text-sm text-muted-foreground">No activity recorded yet</p>) : (<div className="space-y-2">
            {auditLogs.map((log) => (<div key={log.id} className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{log.entity_type}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.created_at)}
                </span>
              </div>))}
          </div>)}
      </div>
    </div>);
}
