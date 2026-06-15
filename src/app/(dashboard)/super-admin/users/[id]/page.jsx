"use client";
import { PageHeader } from "@/components/shared/page-header";

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Loader2, Shield, User, Mail, Phone, Building2,
  Clock, Calendar, Save, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

function cn(...classes) { return classes.filter(Boolean).join(" "); }

const STATUS_OPTIONS = ["active", "inactive", "suspended"];
const STATUS_BADGE = {
  active: "bg-muted text-foreground",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-muted text-muted-foreground",
};

export default function SuperAdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function fetch() {
      try {
        const [userRes, clinicsRes, rolesRes, userRolesRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", id).single(),
          supabase.from("clinics").select("id, name"),
          supabase.from("roles").select("*"),
          supabase.from("user_roles").select("role_id").eq("user_id", id),
        ]);

        if (userRes.error || !userRes.data) {
          toast.error("User not found");
          navigate("/admin/users");
          return;
        }

        setUser(userRes.data);
        setForm({
          full_name: userRes.data.full_name,
          phone: userRes.data.phone || "",
          status: userRes.data.status,
          clinic_id: userRes.data.clinic_id || "",
          is_super_admin: userRes.data.is_super_admin,
        });
        setClinics(clinicsRes.data ?? []);
        setAllRoles(rolesRes.data ?? []);
        setUserRoles((userRolesRes.data ?? []).map((r) => r.role_id));
      } catch {
        toast.error("Failed to load user data");
        navigate("/admin/users");
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [id, navigate]);

  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {};
      if (form.full_name !== user.full_name) updates.full_name = form.full_name;
      if (form.phone !== (user.phone || "")) updates.phone = form.phone || null;
      if (form.status !== user.status) updates.status = form.status;
      if (form.clinic_id !== (user.clinic_id || "")) updates.clinic_id = form.clinic_id || null;
      if (form.is_super_admin !== user.is_super_admin) updates.is_super_admin = form.is_super_admin;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("users").update(updates).eq("id", id);
        if (error) throw error;
      }

      setUser((prev) => ({ ...prev, ...updates }));
      setEditMode(false);
      toast.success("User updated");
    } catch (err) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRole(roleId) {
    const has = userRoles.includes(roleId);
    try {
      if (has) {
        await supabase.from("user_roles").delete().eq("user_id", id).eq("role_id", roleId);
        setUserRoles((prev) => prev.filter((r) => r !== roleId));
        toast.success("Role removed");
      } else {
        await supabase.from("user_roles").insert({ user_id: id, role_id: roleId });
        setUserRoles((prev) => [...prev, roleId]);
        toast.success("Role added");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    }
  }

  async function handleDisable() {
    try {
      const newStatus = user.status === "suspended" ? "active" : "suspended";
      await supabase.from("users").update({ status: newStatus }).eq("id", id);
      setUser((prev) => ({ ...prev, status: newStatus }));
      toast.success(newStatus === "suspended" ? "User disabled" : "User enabled");
    } catch (err) {
      toast.error(err.message || "Failed to update user");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const clinicName = clinics.find((c) => c.id === user.clinic_id)?.name;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Back to Users
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <User className="size-6 text-primary" />
          </div>
          <PageHeader
            title={<>{user.full_name} {user.is_super_admin && <Shield className="size-4 text-muted-foreground" title="Super Admin" />}</>}
            description={user.email}
          />
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Edit User
            </button>
          ) : (
            <>
              <button onClick={() => { setEditMode(false); setForm({
                full_name: user.full_name, phone: user.phone || "",
                status: user.status, clinic_id: user.clinic_id || "",
                is_super_admin: user.is_super_admin,
              });}}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Account Details</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              {editMode ? (
                <input value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />
              ) : (
                <p className="mt-0.5 text-sm">{user.full_name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <p className="mt-0.5 text-sm flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" /> {user.email}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              {editMode ? (
                <input value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary"
                  placeholder="+250..." />
              ) : (
                <p className="mt-0.5 text-sm flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" /> {user.phone || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Organization & Status</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Clinic</label>
              {editMode ? (
                <select value={form.clinic_id}
                  onChange={(e) => setForm((f) => ({ ...f, clinic_id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary">
                  <option value="">No clinic</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <p className="mt-0.5 text-sm flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" /> {clinicName || "—"}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              {editMode ? (
                <select value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <p className="mt-0.5">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_BADGE[user.status] || "bg-muted text-muted-foreground")}>{user.status}</span>
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Super Admin</label>
              {editMode ? (
                <label className="mt-1 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_super_admin}
                    onChange={(e) => setForm((f) => ({ ...f, is_super_admin: e.target.checked }))}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm">{form.is_super_admin ? "Yes" : "No"}</span>
                </label>
              ) : (
                <p className="mt-0.5 text-sm flex items-center gap-1.5">
                  {user.is_super_admin ? <><Shield className="size-3.5 text-muted-foreground" /> Super Admin</> : "No"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Roles</h2>
        {allRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles defined.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allRoles.map((role) => {
              const has = userRoles.includes(role.id);
              return (
                <button key={role.id} onClick={() => handleToggleRole(role.id)}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    has ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-accent text-muted-foreground hover:bg-accent/80")}>
                  {has ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  {role.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleResetPassword}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            <Mail className="size-4" /> Send Password Reset Email
          </button>
          <button onClick={handleDisable}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              user.status === "suspended"
                ? "border text-foreground hover:bg-accent"
                : "border text-muted-foreground hover:bg-accent"
            )}>
            <AlertTriangle className="size-4" />
            {user.status === "suspended" ? "Enable User" : "Disable User"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Timestamps</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" /> Created: {new Date(user.created_at).toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" /> Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
          </div>
        </div>
      </div>
    </div>
  );
}
