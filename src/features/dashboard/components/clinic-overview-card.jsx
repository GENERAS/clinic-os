"use client";
import { Hospital, Clock, CalendarDays } from "lucide-react";
export function ClinicOverviewCard({ clinic }) {
    if (!clinic) {
        return (<div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">Clinic information unavailable</p>
      </div>);
    }
    return (<div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Hospital className="size-5 text-primary"/>
        </div>
        <div>
          <p className="font-semibold">{clinic.name}</p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${clinic.status === "active"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
            {clinic.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4"/>
          <span>{clinic.today_date}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4"/>
          <span>{clinic.current_time}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4"/>
          <span>Hours: {clinic.operating_hours}</span>
        </div>
      </div>
    </div>);
}
