"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getNotificationService } from "@/features/notifications/services/notification.service";
export function Topbar({ onMenuClick, className }) {
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        if (!clinicId) return;
        getNotificationService().getUnreadCount(clinicId).then(setUnreadCount).catch(() => {});
    }, [clinicId]);
    const initials = user?.fullName
        ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.charAt(0).toUpperCase() ?? "?";
    return (
        <header className={cn("bg-background/80 border-border/50 flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4 lg:px-6 backdrop-blur-sm", className)}>
            <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={onMenuClick} className="text-muted-foreground hover:text-foreground -ml-1 flex size-10 items-center justify-center rounded-md lg:hidden touch-target">
                    <Menu className="size-5" />
                </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => navigate("/notifications")} className="text-muted-foreground hover:text-foreground relative flex size-10 items-center justify-center rounded-md transition-colors touch-target">
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-medium leading-none">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
                <div className="bg-primary/10 text-primary ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {initials}
                </div>
            </div>
        </header>
    );
}
