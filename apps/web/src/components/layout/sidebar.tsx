"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/utils/cn"
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarClock,
  Calendar,
  Clock,
  Package,
  MessageCircle,
  Settings,
  X,
  Hospital,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { can } from "@/features/auth/utils/permissions"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function SidebarNav({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { clinic, logout } = useAuth()

  const allNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/appointments", label: "Appointments", icon: CalendarClock },
    { href: "/appointments/today", label: "  Today", icon: Clock },
    { href: "/appointments/calendar", label: "  Calendar", icon: Calendar },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/settings/staff", label: "Staff", icon: UserCog },
    { href: "/settings", label: "Clinic Settings", icon: Settings },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Hospital className="size-6" />
            <span>{clinic?.name ?? "ClinicOS"}</span>
          </Link>
          <button
            onClick={onClose}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded-md p-1 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={allNavItems} onClose={onClose} />
        </nav>

        <div className="border-sidebar-border border-t p-3">
          <button
            onClick={logout}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
