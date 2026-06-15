"use client";
import { Clock } from "lucide-react";
const activityIcons = {
    appointments: "📋",
    patients: "👤",
    inventory: "📦",
    clinics: "🏥",
    users: "👥",
};
const getIcon = (entity) => {
    for (const [key, icon] of Object.entries(activityIcons)) {
        if (entity.includes(key))
            return icon;
    }
    return "📌";
};
export function ActivityFeedCard({ activities }) {
    if (activities.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>);
    }
    return (<div className="space-y-1">
      {activities.map((activity) => (<div key={activity.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30">
          <span className="mt-0.5 text-base">{getIcon(activity.entity_type)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <span className="font-medium">{activity.user_name}</span>{" "}
              <span className="text-muted-foreground">{activity.action}</span>
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3"/>
              {formatTimeAgo(activity.created_at)}
            </p>
          </div>
        </div>))}
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
