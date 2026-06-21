"use client";
import { useState } from "react";

export function ResponsiveTable({ children, breakpoint = "md" }) {
  return (
    <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
      <div className={`inline-block min-w-full align-middle ${breakpoint === "md" ? "md:hidden" : "lg:hidden"}`}>
        {children}
      </div>
    </div>
  );
}

export function MobileCardGrid({ children, breakpoint = "md" }) {
  return (
    <div className={`grid gap-3 ${breakpoint === "md" ? "md:hidden" : "lg:hidden"}`}>
      {children}
    </div>
  );
}

export function DesktopTable({ children, breakpoint = "md" }) {
  return (
    <div className={`hidden ${breakpoint === "md" ? "md:block" : "lg:block"} overflow-x-auto`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
}

export function useResponsiveTable() {
  const [expandedRow, setExpandedRow] = useState(null);
  return { expandedRow, setExpandedRow };
}
