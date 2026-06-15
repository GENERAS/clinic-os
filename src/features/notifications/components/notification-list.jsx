"use client";
import { useState } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, CheckCheck, Loader2 } from "lucide-react";
const TYPE_META = {
    info: { icon: Info, color: "text-blue-500" },
    warning: { icon: AlertTriangle, color: "text-amber-500" },
    success: { icon: CheckCircle, color: "text-emerald-500" },
    error: { icon: XCircle, color: "text-red-500" },
};
function getTypeMeta(type) {
    if (type === "info")
        return TYPE_META.info;
    if (type === "warning")
        return TYPE_META.warning;
    if (type === "success")
        return TYPE_META.success;
    if (type === "error")
        return TYPE_META.error;
    return TYPE_META.info;
}
function formatTimeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return "Just now";
    if (mins < 60)
        return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}
export function NotificationList({ notifications, loading, onMarkRead }) {
    const [markingId, setMarkingId] = useState(null);
    if (loading) {
        return (<div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (notifications.length === 0) {
        return (<div className="flex flex-col items-center gap-3 py-16">
        <Bell className="size-12 text-muted-foreground/40"/>
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>);
    }
    const handleMarkRead = async (id) => {
        setMarkingId(id);
        try {
            await onMarkRead(id);
        }
        finally {
            setMarkingId(null);
        }
    };
    return (<div className="divide-y divide-border">
      {notifications.map((n) => {
            const { icon: Icon, color } = getTypeMeta(n.type);
            return (<div key={n.id} className={`flex items-start gap-4 px-4 py-4 ${!n.is_read ? "bg-primary/5" : ""}`}>
            <Icon className={`mt-0.5 size-5 shrink-0 ${color}`}/>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
              {n.message && (<p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>)}
              <p className="mt-1 text-xs text-muted-foreground/60">
                {formatTimeAgo(n.created_at)}
              </p>
            </div>
            {!n.is_read && (<button onClick={() => handleMarkRead(n.id)} disabled={markingId === n.id} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50" title="Mark as read">
                {markingId === n.id ? (<Loader2 className="size-4 animate-spin"/>) : (<CheckCheck className="size-4"/>)}
              </button>)}
          </div>);
        })}
    </div>);
}
