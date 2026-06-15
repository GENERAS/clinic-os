import { createClient } from "@/lib/supabase/client";
export function getClinicService() {
    const supabase = createClient();
    return {
        async findById(id) {
            const { data, error } = await supabase
                .from("clinics")
                .select("*")
                .eq("id", id)
                .single();
            if (error)
                throw error;
            return data;
        },
        async findBySlug(slug) {
            const { data, error } = await supabase
                .from("clinics")
                .select("*")
                .eq("slug", slug)
                .single();
            if (error)
                throw error;
            return data;
        },
        async update(id, values) {
            const { data, error } = await supabase
                .from("clinics")
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
