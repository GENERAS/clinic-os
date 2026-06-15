import { cn } from "@/utils/cn";
export function SectionCard({ title, description, icon, children, className, actions }) {
    return (<div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm", className)}>
      {(title || icon || actions) && (<div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>)}
      <div className={cn(className?.includes("no-pad") ? "" : "px-5 pb-4")}>{children}</div>
    </div>);
}
