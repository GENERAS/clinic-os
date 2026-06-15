import { createClient } from "@/lib/supabase/client";
export function getAuditService() {
    const supabase = createClient();
    return {
        async log(values) {
            const { error } = await supabase
                .from("audit_logs")
                .insert(values);
            if (error)
                throw error;
        },
        async findByClinic(clinicId) {
            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error)
                throw error;
            return data;
        },
    };
}
