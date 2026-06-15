"use client";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
};
const typeColors = {
    info: "text-blue-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    error: "text-red-500",
};
export function NotificationsPanel({ notifications, onMarkRead, onMarkAllRead }) {
    const unread = notifications.filter((n) => !n.is_read).length;
    if (notifications.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-8 text-center">
        <Bell className="size-8 text-muted-foreground/40"/>
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>);
    }
    return (<div className="space-y-2">
      {unread > 0 && (<div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">{unread} unread</span>
          {onMarkAllRead && (<button onClick={onMarkAllRead} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <CheckCheck className="size-3"/>
              Mark all read
            </button>)}
        </div>)}

      <div className="space-y-1">
        {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            const color = typeColors[n.type] || "text-blue-500";
            return (<div key={n.id} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${!n.is_read ? "bg-primary/5" : ""} hover:bg-muted/30`}>
              <div className={`mt-0.5 ${color}`}>
                <Icon className="size-4"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                {n.message && (<p className="text-xs text-muted-foreground">{n.message}</p>)}
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="size-3"/>
                  {formatTimeAgo(n.created_at)}
                </p>
              </div>
              {!n.is_read && onMarkRead && (<button onClick={() => onMarkRead(n.id)} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted" title="Mark as read">
                  <CheckCheck className="size-3.5"/>
                </button>)}
            </div>);
        })}
      </div>
    </div>);
}
function formatTimeAgo(dateStr) {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)
        return "Just now";
    if (diffMins < 60)
        return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
        return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
}
