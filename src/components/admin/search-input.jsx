import { Search } from "lucide-react";
import { cn } from "@/utils/cn";

export function SearchInput({ value, onChange, placeholder = "Search...", className }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
      />
    </div>
  );
}
