import { cn } from "@/utils/cn";
import { Inbox } from "lucide-react";
export function EmptyState({ title, description, icon, action, className, }) {
    return (<div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="bg-muted text-muted-foreground mb-4 flex size-16 items-center justify-center rounded-full">
        {icon ?? <Inbox className="size-8"/>}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (<p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>)}
      {action && <div className="mt-4">{action}</div>}
    </div>);
}
