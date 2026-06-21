"use client";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard, Users, CalendarClock, Clock, Package, MessageCircle,
  Bell, User, Settings, X, Hospital, LogOut, Calendar, UserCog,
  Shield, CreditCard, Stethoscope, Heart, Beaker, DollarSign, Pill, TrendingUp
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

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

function NavSection({ label, children }) {
  return (
    <div className="mb-3">
      <p className="text-slate-500 mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest">
        {label}
      </p>
      {children}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }) {
  const { clinic, user, logout, isSuperAdmin } = useAuth();
  return (<>
    {isOpen && (<div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose}/>)}

    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-900 text-slate-50 transition-transform duration-300 lg:static lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600">
          <Hospital className="size-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-white">{clinic?.name ?? "ClinicOS"}</span>
          <span className="text-slate-500 text-[10px] leading-tight">{user?.email ?? ""}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-4">
        <NavSection label="Overview">
          <NavItem item={{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }} onClose={onClose} />
        </NavSection>

        <NavSection label="Operations">
          <NavItem item={{ href: "/appointments/today", label: "Today", icon: Clock }} onClose={onClose} />
          <NavItem item={{ href: "/appointments", label: "Appointments", icon: CalendarClock }} onClose={onClose} />
          <NavItem item={{ href: "/appointments/calendar", label: "Calendar", icon: Calendar }} onClose={onClose} />
          <NavItem item={{ href: "/patients", label: "Patients", icon: Users }} onClose={onClose} />
          <NavItem item={{ href: "/inventory", label: "Inventory", icon: Package }} onClose={onClose} />
        </NavSection>

        <NavSection label="Clinical">
          <NavItem item={{ href: "/triage", label: "Triage", icon: Heart }} onClose={onClose} />
          <NavItem item={{ href: "/consultations/new", label: "New Consultation", icon: Stethoscope }} onClose={onClose} />
          <NavItem item={{ href: "/investigations", label: "Lab Results", icon: Beaker }} onClose={onClose} />
          <NavItem item={{ href: "/pharmacy", label: "Pharmacy", icon: Pill }} onClose={onClose} />
        </NavSection>

        <NavSection label="Communication">
          <NavItem item={{ href: "/notifications", label: "Notifications", icon: Bell }} onClose={onClose} />
          <NavItem item={{ href: "/whatsapp", label: "WhatsApp", icon: MessageCircle }} onClose={onClose} />
        </NavSection>

        <NavSection label="Management">
          <NavItem item={{ href: "/reports", label: "Reports", icon: TrendingUp }} onClose={onClose} />
          <NavItem item={{ href: "/financials", label: "Financials", icon: DollarSign }} onClose={onClose} />
          <NavItem item={{ href: "/subscription", label: "Subscription", icon: CreditCard }} onClose={onClose} />
        </NavSection>

        <NavSection label="Settings">
          <NavItem item={{ href: "/settings", label: "Clinic Settings", icon: Settings }} onClose={onClose} />
          <NavItem item={{ href: "/settings/staff", label: "Staff", icon: UserCog }} onClose={onClose} />
          <NavItem item={{ href: "/profile", label: "Profile", icon: User }} onClose={onClose} />
        </NavSection>
      </nav>

      <div className="border-t border-slate-800 px-2 py-2">
        {isSuperAdmin && (
          <Link
            to="/admin"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors mb-0.5"
          >
            <Shield className="size-[18px] shrink-0" />
            Admin Portal
          </Link>
        )}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
          <LogOut className="size-[18px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  </>);
}
