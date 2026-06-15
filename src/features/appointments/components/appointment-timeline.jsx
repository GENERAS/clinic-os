"use client";
import { Clock } from "lucide-react";
import { APPOINTMENT_STATUS_LABELS } from "../types";
export function AppointmentTimeline({ history }) {
    if (history.length === 0) {
        return (<p className="py-4 text-center text-sm text-muted-foreground">No status changes recorded</p>);
    }
    return (<div className="space-y-0">
      {history.map((item, index) => (<div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < history.length - 1 && (<div className="absolute left-[7px] top-4 h-full w-0.5 bg-border"/>)}
          <div className={`relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 ${item.old_status === null
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/30 bg-background"}`}/>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {item.old_status === null
                ? "Created"
                : `${APPOINTMENT_STATUS_LABELS[item.old_status] || item.old_status} → ${APPOINTMENT_STATUS_LABELS[item.new_status] || item.new_status}`}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3"/>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              {item.changed_by_name && (<span>by {item.changed_by_name}</span>)}
            </div>
          </div>
        </div>))}
    </div>);
}
