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
        <header className={cn("bg-background/80 border-border/50 flex h-14 items-center justify-between border-b px-4 backdrop-blur-sm lg:px-6", className)}>
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="text-muted-foreground hover:text-foreground -ml-1 rounded-md p-1 lg:hidden">
                    <Menu className="size-5" />
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => navigate("/notifications")} className="text-muted-foreground hover:text-foreground relative rounded-md p-1.5 transition-colors">
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-medium">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
                <div className="bg-primary/10 text-primary ml-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                    {initials}
                </div>
            </div>
        </header>
    );
}
