import { createClient } from "@/lib/supabase/client";
export function getUserService() {
    const supabase = createClient();
    return {
        async findById(id) {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", id)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
        async findByClinic(clinicId) {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
            return data;
        },
        async findByEmail(email) {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("email", email)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
        async create(values) {
            const { data, error } = await supabase
                .from("users")
                .insert(values)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async update(id, values) {
            const { data, error } = await supabase
                .from("users")
                .update(values)
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
    };
}
