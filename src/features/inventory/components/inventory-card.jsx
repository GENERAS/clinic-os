"use client";
import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { InventoryStatusBadge } from "./inventory-status-badge";
export function InventoryCard({ item, onAdjust }) {
    return (<div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/inventory/${item.id}`} className="font-medium hover:underline">
            {item.name}
          </Link>
          <p className="text-xs text-muted-foreground">{item.category_name || "Uncategorized"}</p>
        </div>
        <InventoryStatusBadge status={item.status}/>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="tabular-nums">
          <span className="font-medium">{item.current_stock}</span>{" "}
          <span className="text-xs text-muted-foreground">{item.unit}</span>
        </span>
        <span className="text-xs text-muted-foreground">Min: {item.minimum_stock}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to={`/inventory/${item.id}`} className="flex-1 rounded-lg border px-3 py-1.5 text-center text-xs font-medium hover:bg-muted">
          View
        </Link>
        {onAdjust && (<button onClick={() => onAdjust(item.id)} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <span className="inline-flex items-center justify-center gap-1">
              <PackageOpen className="size-3"/>
              Adjust
            </span>
          </button>)}
      </div>
    </div>);
}
