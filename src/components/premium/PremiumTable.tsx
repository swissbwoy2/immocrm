import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface PremiumTableProps {
  children: ReactNode;
  className?: string;
}

export function PremiumTable({ children, className }: PremiumTableProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl',
      'bg-card border border-border/50',
      'animate-fade-in',
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />
      
      <div className="relative overflow-x-auto">
        <Table>
          {children}
        </Table>
      </div>
    </div>
  );
}

interface PremiumTableHeaderProps {
  children: ReactNode;
}

export function PremiumTableHeader({ children }: PremiumTableHeaderProps) {
  return (
    <TableHeader className="bg-muted/30">
      {children}
    </TableHeader>
  );
}

interface PremiumTableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PremiumTableRow({ children, onClick, className }: PremiumTableRowProps) {
  return (
    <TableRow 
      className={cn(
        'group transition-all duration-300',
        'hover:bg-muted/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </TableRow>
  );
}

interface PremiumTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function PremiumTableSkeleton({ rows = 5, columns = 4 }: PremiumTableSkeletonProps) {
  return (
    <PremiumTable>
      <PremiumTableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </PremiumTableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="animate-fade-in" style={{ animationDelay: `${rowIndex * 50}ms` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </PremiumTable>
  );
}

// Re-export Table components for convenience
export { TableBody, TableCell, TableHead, TableRow };
