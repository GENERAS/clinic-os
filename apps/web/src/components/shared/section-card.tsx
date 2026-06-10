import { cn } from "@/utils/cn"

interface SectionCardProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function SectionCard({ title, description, icon, children, className, actions }: SectionCardProps) {
  return (
    <div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm", className)}>
      {(title || icon || actions) && (
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <div>
              <h3 className="font-semibold">{title}</h3>
              {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}
