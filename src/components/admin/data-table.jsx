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
  renderRow,
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

  function renderMobileCards() {
    return (
      <div className="grid gap-3 sm:hidden p-3">
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400">{emptyMessage}</p>
            {emptyAction && <div className="mt-3">{emptyAction}</div>}
          </div>
        ) : (
          sorted.map((row) => {
            const rowId = row[keyField];
            if (renderRow) return <div key={rowId}>{renderRow(row)}</div>;
            return (
              <div key={rowId} className={cn("rounded-xl border bg-white p-3 shadow-sm space-y-2", selected.has(rowId) && "ring-2 ring-teal-500")}>
                {selectable && (
                  <div className="flex items-center justify-between mb-1">
                    <button onClick={() => toggleOne(rowId)} className="flex items-center text-xs font-medium text-slate-500">
                      {selected.has(rowId)
                        ? <CheckSquare className="size-4 text-teal-600 mr-1" />
                        : <Square className="size-4 text-slate-400 mr-1" />}
                      Select
                    </button>
                  </div>
                )}
                {columns.filter(c => c.key !== "actions").slice(0, 3).map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 shrink-0">{col.header}</span>
                    <span className="text-xs text-right truncate max-w-[60%]">
                      {col.mobileRender ? col.mobileRender(row) : col.render ? col.render(row) : row[col.key]}
                    </span>
                  </div>
                ))}
                {/* Show remaining columns as a collapsible section */}
                {columns.filter(c => c.key !== "actions").length > 3 && (
                  <details className="group">
                    <summary className="text-[10px] font-medium text-slate-400 cursor-pointer hover:text-slate-600 pt-1">
                      Show more ({columns.filter(c => c.key !== "actions").length - 3})
                    </summary>
                    <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
                      {columns.filter(c => c.key !== "actions").slice(3).map((col) => (
                        <div key={col.key} className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 shrink-0">{col.header}</span>
                          <span className="text-xs text-right truncate max-w-[60%]">
                            {col.mobileRender ? col.mobileRender(row) : col.render ? col.render(row) : row[col.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {columns.some(c => c.key === "actions") && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                    {columns.find(c => c.key === "actions")?.render?.(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0">
      {bulkActions && selected.size > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 sm:px-5 py-2.5">
          <span className="text-xs font-medium text-slate-500 shrink-0">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
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

      {/* Mobile card view */}
      {renderMobileCards()}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
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
                    "px-3 lg:px-5 py-3 whitespace-nowrap",
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
                      <td key={col.key} className={cn("px-3 lg:px-5 py-3 text-slate-600 max-w-[200px]", col.cellClassName)}>
                        <div className="truncate">
                          {col.render ? col.render(row) : row[col.key]}
                        </div>
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
