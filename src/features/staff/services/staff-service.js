import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";

function generateToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getStaffService() {
    const supabase = createClient();
    const audit = getAuditService();
    return {
        async getAllRoles() {
            const { data, error } = await supabase
                .from("roles")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data || [];
        },
        async getStaff(clinicId) {
            const { data: users, error } = await supabase
                .from("users")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;

            const userIds = (users || []).map(u => u.id);
            const { data: userRolesData } = await supabase
                .from("user_roles")
                .select("user_id, role_id")
                .in("user_id", userIds);

            const roleIds = [...new Set((userRolesData || []).map(ur => ur.role_id))];
            const { data: rolesData } = await supabase
                .from("roles")
                .select("id, name")
                .in("id", roleIds);
            const rolesMap = new Map((rolesData || []).map(r => [r.id, r]));

            const rolesByUser = new Map();
            (userRolesData || []).forEach(ur => {
                if (!rolesByUser.has(ur.user_id)) rolesByUser.set(ur.user_id, []);
                const role = rolesMap.get(ur.role_id);
                if (role) rolesByUser.get(ur.user_id).push(role);
            });

            return (users || [])
                .filter(u => rolesByUser.has(u.id))
                .map(u => ({
                    ...u,
                    roles: rolesByUser.get(u.id),
                    permissions: [],
                }));
        },
        async getStaffById(clinicId, userId) {
            const { data: user, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .eq("clinic_id", clinicId)
                .single();
            if (error)
                return null;

            const { data: userRolesData } = await supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", userId);

            const roleIds = (userRolesData || []).map(ur => ur.role_id);
            let roles = [];
            if (roleIds.length > 0) {
                const { data: rolesData } = await supabase
                    .from("roles")
                    .select("id, name")
                    .in("id", roleIds);
                roles = rolesData || [];
            }

            const roleIdsForPerms = roles.map((r) => r.id);
            let permissions = [];
            if (roleIdsForPerms.length > 0) {
                const { data: permData } = await supabase
                    .from("role_permissions")
                    .select("permission_id")
                    .in("role_id", roleIdsForPerms);
                const permIds = [...new Set((permData || []).map(rp => rp.permission_id))];
                if (permIds.length > 0) {
                    const { data: perms } = await supabase
                        .from("permissions")
                        .select("id, name, description")
                        .in("id", permIds);
                    permissions = perms || [];
                }
            }
            return { ...user, roles, permissions };
        },
        async inviteStaff(clinicId, email, roleId, invitedByUserId) {
            const token = generateToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from("staff_invitations")
                .insert({
                clinic_id: clinicId,
                email,
                role_id: roleId,
                token,
                expires_at: expiresAt,
            })
                .select()
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: invitedByUserId,
                action: "invitation sent",
                entity_type: "staff_invitations",
                entity_id: data.id,
                new_value: { email, role_id: roleId, expires_at: expiresAt },
            }).catch(() => { });
            return data;
        },
        async getInvitations(clinicId) {
            const { data, error } = await supabase
                .from("staff_invitations")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;

            const roleIds = [...new Set((data || []).map(inv => inv.role_id).filter(Boolean))];
            const rolesMap = new Map();
            if (roleIds.length > 0) {
                const { data: rolesData } = await supabase
                    .from("roles")
                    .select("id, name")
                    .in("id", roleIds);
                (rolesData || []).forEach(r => rolesMap.set(r.id, r.name));
            }

            return (data || [])
                .filter(inv => rolesMap.has(inv.role_id))
                .map((inv) => ({
                id: inv.id,
                email: inv.email,
                role_name: rolesMap.get(inv.role_id),
                status: inv.status,
                created_at: inv.created_at,
                expires_at: inv.expires_at,
                accepted_at: inv.accepted_at,
            }));
        },
        async cancelInvitation(clinicId, invitationId, userId) {
            const { error } = await supabase
                .from("staff_invitations")
                .update({ status: "cancelled" })
                .eq("id", invitationId)
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "invitation cancelled",
                entity_type: "staff_invitations",
                entity_id: invitationId,
            }).catch(() => { });
        },
        async updateStaff(clinicId, staffId, values, userId) {
            const { data, error } = await supabase
                .from("users")
                .update({ ...values, updated_at: new Date().toISOString() })
                .eq("id", staffId)
                .eq("clinic_id", clinicId)
                .select()
                .single();
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "staff updated",
                entity_type: "users",
                entity_id: staffId,
                new_value: values,
            }).catch(() => { });
            return data;
        },
        async changeRole(clinicId, staffId, roleId, userId) {
            const { data: existing } = await supabase
                .from("user_roles")
                .select("id, role_id")
                .eq("user_id", staffId)
                .maybeSingle();
            if (existing) {
                const { error } = await supabase
                    .from("user_roles")
                    .update({ role_id: roleId })
                    .eq("id", existing.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase
                    .from("user_roles")
                    .insert({ user_id: staffId, role_id: roleId });
                if (error)
                    throw error;
            }
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "role changed",
                entity_type: "users",
                entity_id: staffId,
                old_value: existing ? { role_id: existing.role_id } : null,
                new_value: { role_id: roleId },
            }).catch(() => { });
        },
        async setStaffStatus(clinicId, staffId, status, userId) {
            await this.updateStaff(clinicId, staffId, { status: status }, userId);
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: `staff ${status === "active" ? "reactivated" : status === "suspended" ? "suspended" : "deactivated"}`,
                entity_type: "users",
                entity_id: staffId,
                new_value: { status },
            }).catch(() => { });
        },
        async removeStaff(clinicId, staffId, userId) {
            const { data: roleRows } = await supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", staffId);

            const roleIds = (roleRows || []).map(r => r.role_id);

            const { data: ownerRoles } = await supabase
                .from("roles")
                .select("id")
                .eq("name", "Owner")
                .in("id", roleIds);

            const ownerRoleIds = (ownerRoles || []).map((r) => r.id);
            if (ownerRoleIds.length > 0) {
                const { count } = await supabase
                    .from("user_roles")
                    .select("*", { count: "exact", head: true })
                    .in("role_id", ownerRoleIds);
                if ((count || 0) <= 1) {
                    throw new Error("Cannot remove the only Owner. Promote another user to Owner first.");
                }
            }

            const { error } = await supabase
                .from("users")
                .update({ status: "inactive", updated_at: new Date().toISOString() })
                .eq("id", staffId)
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
            audit.log({
                clinic_id: clinicId,
                user_id: userId,
                action: "staff removed",
                entity_type: "users",
                entity_id: staffId,
            }).catch(() => { });
        },
        async uploadAvatar(clinicId, staffId, file, userId) {
            const ext = file.name.split(".").pop();
            const filePath = `avatars/${staffId}/avatar.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });
            if (uploadError)
                throw uploadError;
            const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);
            const avatarUrl = urlData.publicUrl;
            await this.updateStaff(clinicId, staffId, { avatar_url: avatarUrl }, userId);
            return avatarUrl;
        },
        async deleteAvatar(clinicId, staffId, userId) {
            await this.updateStaff(clinicId, staffId, { avatar_url: null }, userId);
        },
    };
}
