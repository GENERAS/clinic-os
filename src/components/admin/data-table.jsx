"use client";
import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square, Loader2 } from "lucide-react";

export function DataTable({
  columns = [],
  data = [],
  keyField = "id",
  selectable = false,
  onSelectionChange,
  sortable = true,
  initialSort,
  loading = false,
  emptyMessage = "No data found",
  emptyAction,
  actions: bulkActions,
}) {
  const [sort, setSort] = useState(initialSort || { key: null, dir: "asc" });
  const [selected, setSelected] = useState(new Set());

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sort.dir === "asc" ? cmp : -cmp;
      }
      return sort.dir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, sort]);

  function toggleSort(key) {
    if (!sortable) return;
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }

  function toggleAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(sorted.map((r) => r[keyField]));
      setSelected(all);
      onSelectionChange?.(Array.from(all));
    }
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  }

  function SortIcon({ column }) {
    if (!sortable || !column.sortable) return null;
    if (sort.key !== column.key) return <ChevronsUpDown className="size-3 text-slate-300" />;
    return sort.dir === "asc" ? <ChevronUp className="size-3 text-slate-600" /> : <ChevronDown className="size-3 text-slate-600" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {bulkActions && selected.size > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
          <span className="text-xs font-medium text-slate-500">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(Array.from(selected))}
                className={cn(
                  "rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors",
                  action.danger && "text-red-600 hover:bg-red-50"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className="flex items-center">
                    {selected.size === sorted.length && sorted.length > 0
                      ? <CheckSquare className="size-4 text-teal-600" />
                      : <Square className="size-4 text-slate-400" />}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={cn(
                    "px-5 py-3 whitespace-nowrap",
                    col.sortable !== false && sortable ? "cursor-pointer select-none hover:text-slate-700" : "",
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    <SortIcon column={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-5 py-12 text-center">
                  <p className="text-sm text-slate-400">{emptyMessage}</p>
                  {emptyAction && <div className="mt-3">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const rowId = row[keyField];
                return (
                  <tr
                    key={rowId}
                    className={cn(
                      "hover:bg-slate-50 transition-colors",
                      selected.has(rowId) ? "bg-teal-50/30" : ""
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <button onClick={() => toggleOne(rowId)} className="flex items-center">
                          {selected.has(rowId)
                            ? <CheckSquare className="size-4 text-teal-600" />
                            : <Square className="size-4 text-slate-400" />}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-5 py-3 text-slate-600", col.cellClassName)}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
