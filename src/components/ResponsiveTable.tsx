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
      "animate-fade-in",
      className
    )}>
      <div className="min-w-[600px] md:min-w-0">
        {children}
      </div>
    </div>
  );
}

// Empty state component for tables
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function TableEmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="empty-state-icon mb-4 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action && <div className="animate-fade-in animate-delay-200">{action}</div>}
    </div>
  );
}

// Skeleton loader for table rows
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 animate-fade-in"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="skeleton h-10 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}