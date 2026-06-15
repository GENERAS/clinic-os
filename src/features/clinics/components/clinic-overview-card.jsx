"use client";
import { Building2, MapPin, Circle } from "lucide-react";
import { cn } from "@/utils/cn";
const statusConfig = {
    active: { label: "Active", className: "text-green-600" },
    inactive: { label: "Inactive", className: "text-yellow-600" },
    suspended: { label: "Suspended", className: "text-red-600" },
};
export function ClinicOverviewCard({ name, logoUrl, status, city, isOpenNow, className }) {
    const statusInfo = statusConfig[status];
    return (<div className={cn("flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm", className)}>
      {logoUrl ? (<img src={logoUrl} alt={name} className="size-14 rounded-lg border object-cover"/>) : (<div className="flex size-14 items-center justify-center rounded-lg bg-muted">
          <Building2 className="size-6 text-muted-foreground"/>
        </div>)}

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {city && (<span className="flex items-center gap-1">
              <MapPin className="size-3"/>
              {city}
            </span>)}
          <span className={cn("flex items-center gap-1 font-medium", statusInfo.className)}>
            <Circle className="size-2 fill-current"/>
            {statusInfo.label}
          </span>
          {isOpenNow !== undefined && (<span className={cn("flex items-center gap-1", isOpenNow ? "text-green-600" : "text-muted-foreground")}>
              <Circle className="size-2 fill-current"/>
              {isOpenNow ? "Open Now" : "Closed"}
            </span>)}
        </div>
      </div>
    </div>);
}
