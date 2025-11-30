import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

// Wrapper component that adds horizontal scroll to tables on mobile/tablet
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn(
      "relative w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0",
      "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
      className
    )}>
      <div className="min-w-[600px] md:min-w-0">
        {children}
      </div>
    </div>
  );
}
