"use client";
import { cn } from "@/utils/cn";
const styles = {
    in_stock: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    low_stock: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    out_of_stock: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const labels = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
};
export function InventoryStatusBadge({ status, className }) {
    return (<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status], className)}>
      {labels[status]}
    </span>);
}
