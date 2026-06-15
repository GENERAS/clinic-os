"use client";
import { Link } from "react-router-dom";
import { Eye, PackageOpen } from "lucide-react";
import { InventoryStatusBadge } from "./inventory-status-badge";
export function InventoryTable({ items, onAdjust }) {
    if (items.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">No inventory items found</p>
      </div>);
    }
    return (<div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Category</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Min</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Status</th>
            <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Updated</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (<tr key={item.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link to={`/inventory/${item.id}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-xs text-muted-foreground sm:hidden">{item.category_name || "Uncategorized"}</p>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {item.category_name || "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {item.current_stock} <span className="text-xs text-muted-foreground">{item.unit}</span>
              </td>
              <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell tabular-nums">
                {item.minimum_stock}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <InventoryStatusBadge status={item.status}/>
              </td>
              <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground lg:table-cell tabular-nums">
                {new Date(item.updated_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link to={`/inventory/${item.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                    <Eye className="size-3"/>
                    <span className="hidden sm:inline">View</span>
                  </Link>
                  <button onClick={() => onAdjust?.(item.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                    <PackageOpen className="size-3"/>
                    <span className="hidden sm:inline">Adjust</span>
                  </button>
                </div>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
