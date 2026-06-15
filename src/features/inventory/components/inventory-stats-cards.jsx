"use client";
import { Package, AlertTriangle, PackageX, Activity } from "lucide-react";
export function InventoryStatsCards({ total, lowStock, outOfStock }) {
    return (<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Package className="size-4 text-primary"/>
          </div>
          <span className="text-xs text-muted-foreground">Total Items</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{total}</p>
      </div>
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400"/>
          </div>
          <span className="text-xs text-muted-foreground">Low Stock</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{lowStock}</p>
      </div>
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <PackageX className="size-4 text-red-600 dark:text-red-400"/>
          </div>
          <span className="text-xs text-muted-foreground">Out of Stock</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{outOfStock}</p>
      </div>
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Activity className="size-4 text-emerald-600 dark:text-emerald-400"/>
          </div>
          <span className="text-xs text-muted-foreground">In Stock</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{total - lowStock - outOfStock}</p>
      </div>
    </div>);
}
