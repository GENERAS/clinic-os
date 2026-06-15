"use client";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  LayoutDashboard, Building2, CreditCard, Users, MessageCircle,
  BarChart3, ClipboardList, LifeBuoy, Settings, User, LogOut,
  ArrowLeft, Menu, Bell, Search, Shield, Activity
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/whatsapp-health", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/activity", label: "Audit Logs", icon: ClipboardList },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/health", label: "Platform Health", icon: Activity },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavItem({ item, onClose }) {
  const location = useLocation();
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
  return (
    <Link
      to={item.href}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-lg",
        isActive
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      <item.icon className="size-[18px] shrink-0" />
      {item.label}
      {isActive && <span className="absolute right-2 size-1.5 rounded-full bg-teal-500" />}
    </Link>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-900 text-slate-50 transition-transform duration-300 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600">
            <Shield className="size-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">ClinicOS</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} onClose={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="border-t border-slate-800 px-2 py-2 space-y-0.5">
          <Link
            to="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <User className="size-[18px]" />
            Profile
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="size-[18px]" />
            Back to Clinic
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="size-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden -ml-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors">
            <Menu className="size-5" />
          </button>

          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search clinics, users..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none transition-colors focus:bg-white focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
              <span className="text-xs text-slate-500 hidden sm:block max-w-[140px] truncate">{user?.email}</span>
              <Link to="/admin/profile" className="flex size-7 items-center justify-center rounded-full bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors">
                {(user?.fullName || user?.email || "A")[0].toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
          ClinicOS &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
