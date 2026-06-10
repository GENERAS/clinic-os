import { cn } from "@/utils/cn"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingState({
  title = "Loading...",
  description,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <Loader2 className="text-muted-foreground mb-4 size-8 animate-spin" />
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
    </div>
  )
}
