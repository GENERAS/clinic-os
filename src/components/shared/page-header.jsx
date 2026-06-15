import { cn } from "@/utils/cn";
export function PageHeader({ title, description, children, className }) {
    return (<div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && (<p className="text-muted-foreground mt-0.5 text-sm">{description}</p>)}
      </div>
      {children && <div className="mt-2 flex items-center gap-2 sm:mt-0">{children}</div>}
    </div>);
}
