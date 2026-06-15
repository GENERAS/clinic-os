import { cn } from "@/utils/cn";

export function InlineSelect({ value, options, onChange, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded border bg-white px-2 py-1 text-xs font-medium outline-none transition-colors hover:bg-accent focus:border-primary focus:ring-1 focus:ring-primary",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
