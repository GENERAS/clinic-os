import { createClient } from "@/lib/supabase/client";
export function getNotificationService() {
    const supabase = createClient();
    return {
        async getNotifications(clinicId, options) {
            const page = options?.page || 0;
            const pageSize = options?.pageSize || 20;
            const from = page * pageSize;
            const to = from + pageSize - 1;
            let query = supabase
                .from("notifications")
                .select("*", { count: "exact" })
                .eq("clinic_id", clinicId);
            if (options?.filter && options.filter !== "all" && options.filter !== "unread") {
                query = query.eq("type", options.filter);
            }
            else if (options?.filter === "unread") {
                query = query.eq("is_read", false);
            }
            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(from, to);
            if (error)
                throw error;
            return {
                data: (data || []),
                total: count || 0,
            };
        },
        async markAsRead(clinicId, notificationId) {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId)
                .eq("clinic_id", clinicId);
            if (error)
                throw error;
        },
        async markAllAsRead(clinicId) {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("clinic_id", clinicId)
                .eq("is_read", false);
            if (error)
                throw error;
        },
        async getUnreadCount(clinicId) {
            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("clinic_id", clinicId)
                .eq("is_read", false);
            if (error)
                return 0;
            return count || 0;
        },
    };
}
