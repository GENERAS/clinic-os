import { createClient } from "@/lib/supabase/client";
export const authService = {
    async signUp({ email, password, fullName, phone }) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone || null,
                },
            },
        });
        if (error) throw error;
        return data;
    },
    async login({ email, password }) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error)
            throw error;
        return data;
    },
    async logout() {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error)
            throw error;
    },
    async forgotPassword({ email }) {
        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error)
            throw error;
    },
    async resetPassword({ password }) {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error)
            throw error;
    },
    async getCurrentUser() {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error)
            throw error;
        return data.user;
    },
    async getSession() {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        if (error)
            throw error;
        return data.session;
    },
    async updateProfile(userId, values) {
        const supabase = createClient();
        const { error } = await supabase
            .from("users")
            .update({
            full_name: values.full_name,
            phone: values.phone || null,
            updated_at: new Date().toISOString(),
        })
            .eq("id", userId);
        if (error)
            throw error;
    },
    async updatePassword(newPassword) {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error)
            throw error;
    },
    async uploadAvatar(userId, file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `avatars/${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });
        if (uploadError)
            throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;
        const { error: updateError } = await supabase
            .from("users")
            .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", userId);
        if (updateError)
            throw updateError;
        return publicUrl;
    },
};
