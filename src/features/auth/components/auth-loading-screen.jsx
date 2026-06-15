"use client";
import { Loader2 } from "lucide-react";
export function AuthLoadingScreen() {
    return (<div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="text-muted-foreground size-8 animate-spin"/>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>);
}
