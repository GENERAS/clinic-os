"use client"

import { cn } from "@/utils/cn"
import { Bell, Menu, CircleUser } from "lucide-react"

interface TopbarProps {
  onMenuClick: () => void
  className?: string
}

export function Topbar({ onMenuClick, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "bg-background border-border flex h-16 items-center justify-between border-b px-4 lg:px-6",
        className
      )}
    >
      <button
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground rounded-md p-1 lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <div className="hidden lg:block">
        <p className="text-muted-foreground text-sm">Welcome back</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="text-muted-foreground hover:text-foreground relative rounded-md p-1">
          <Bell className="size-5" />
          <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
            3
          </span>
        </button>

        <button className="text-muted-foreground hover:text-foreground rounded-md p-1">
          <CircleUser className="size-6" />
        </button>
      </div>
    </header>
  )
}
