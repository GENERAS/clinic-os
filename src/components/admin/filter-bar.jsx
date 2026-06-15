import { cn } from "@/utils/cn";
import { X } from "lucide-react";

export function FilterBar({ filters = [], onRemove }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {filter.label}
          {onRemove && (
            <button onClick={() => onRemove(filter.key)} className="text-slate-500 hover:text-slate-900">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
