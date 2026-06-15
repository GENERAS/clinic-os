"use client";
import { Link } from "react-router-dom";
import { AlertTriangle, PackageX } from "lucide-react";
export function AlertCard({ alerts }) {
    if (alerts.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <PackageX className="size-5 text-emerald-600 dark:text-emerald-400"/>
        </div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All items in stock</p>
        <p className="text-xs text-muted-foreground">No low stock alerts</p>
      </div>);
    }
    return (<div className="space-y-2">
      {alerts.slice(0, 5).map((alert) => (<Link key={alert.id} to={`/inventory/${alert.id}`} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 transition-colors hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
          <AlertTriangle className="size-5 shrink-0 text-amber-500"/>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{alert.name}</p>
            <p className="text-xs text-muted-foreground">
              {alert.current_stock} / {alert.minimum_stock} {alert.unit}
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                ({Math.round((alert.current_stock / Math.max(alert.minimum_stock, 1)) * 100)}%)
              </span>
            </p>
          </div>
        </Link>))}
      {alerts.length > 5 && (<Link to="/inventory" className="block text-center text-xs font-medium text-primary hover:underline">
          View all {alerts.length} alerts
        </Link>)}
    </div>);
}
