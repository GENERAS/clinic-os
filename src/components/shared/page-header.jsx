import { cn } from "@/utils/cn";
export function PageHeader({ title, description, children, className }) {
    return (<div className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 break-words">{title}</h1>
        {description && (<p className="text-muted-foreground mt-0.5 text-sm break-words">{description}</p>)}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:mt-0.5 shrink-0">{children}</div>}
    </div>);
}
