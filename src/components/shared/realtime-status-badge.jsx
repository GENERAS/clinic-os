"use client";
import { Wifi, WifiOff } from "lucide-react";

export function RealtimeStatusBadge({ status, className = "" }) {
  const isLive = status === "connected";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
      isLive
        ? "border-green-200 text-green-700 bg-green-50"
        : status === "connecting"
          ? "border-blue-200 text-blue-700 bg-blue-50"
          : "border-amber-200 text-amber-700 bg-amber-50"
    } ${className}`}>
      {isLive ? <Wifi className="size-3"/> : <WifiOff className="size-3"/>}
      {isLive ? "Live" : status === "connecting" ? "Connecting..." : status === "reconnecting" ? "Reconnecting..." : "Disconnected"}
    </div>
  );
}
