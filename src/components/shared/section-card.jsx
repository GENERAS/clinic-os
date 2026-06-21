import { cn } from "@/utils/cn";
export function SectionCard({ title, description, icon, children, className, actions }) {
    return (<div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm w-full min-w-0", className)}>
      {(title || icon || actions) && (<div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
            <h3 className="text-sm font-semibold truncate">{title}</h3>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>)}
      <div className={cn(className?.includes("no-pad") ? "" : "px-4 sm:px-5 pb-4")}>{children}</div>
    </div>);
}
