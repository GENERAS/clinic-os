"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
export function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="flex min-h-screen w-full overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)}/>
        <main className="bg-background flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 w-full max-w-full">{children}</main>
      </div>
    </div>);
}
