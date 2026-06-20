"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getNotificationService } from "@/features/notifications/services/notification.service";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { toast } from "sonner";
export default function NotificationsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = getNotificationService();
    const [notifications, setNotifications] = useState([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const load = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const result = await service.getNotifications(clinicId, {
                filter,
                page,
                pageSize: 20,
            });
            setNotifications(result.data);
            setTotal(result.total);
        }
        catch {
            toast.error("Failed to load notifications");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, filter, page]);
    useEffect(() => {
        load();
    }, [load]);
    const handleMarkRead = async (id) => {
        if (!clinicId)
            return;
        try {
            await service.markAsRead(clinicId, id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        }
        catch {
            toast.error("Failed to mark as read");
        }
    };
    const handleMarkAllRead = async () => {
        if (!clinicId)
            return;
        setMarkingAll(true);
        try {
            await service.markAllAsRead(clinicId);
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            toast.success("All notifications marked as read");
        }
        catch {
            toast.error("Failed to mark all as read");
        }
        finally {
            setMarkingAll(false);
        }
    };
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const totalPages = Math.ceil(total / 20);
    if (!clinicId)
        return null;
    return (<div className="space-y-6">
        <PageHeader title="Notifications" description="All clinic alerts and updates">
          {unreadCount > 0 && (<button onClick={handleMarkAllRead} disabled={markingAll} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
              <CheckCheck className="size-4"/>
              {markingAll ? "Marking..." : "Mark All Read"}
            </button>)}
        </PageHeader>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["all", "unread", "info", "warning", "success", "error"].map((f) => (<button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {f === "all" ? "All" : f === "unread" ? `Unread (${total - notifications.filter(n => n.is_read).length + unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>))}
          </div>
          <span className="text-xs text-muted-foreground">
            {total} total
          </span>
        </div>

        <div className="rounded-lg border bg-card">
          <NotificationList notifications={notifications} loading={loading} onMarkRead={handleMarkRead}/>
        </div>

        {totalPages > 1 && (<div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
              Next
            </button>
          </div>)}
      </div>);
}
