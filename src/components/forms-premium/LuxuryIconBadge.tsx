import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LuxuryIconBadgeProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function LuxuryIconBadge({ children, size = 'md', glow = true, className }: LuxuryIconBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl',
        'bg-gradient-to-br from-[hsl(38_55%_65%/0.15)] to-[hsl(28_35%_38%/0.1)]',
        'border border-[hsl(38_45%_48%/0.25)]',
        glow && 'shadow-[0_0_20px_hsl(38_45%_48%/0.2)]',
        sizes[size],
        className,
      )}
    >
      <span className="text-[hsl(38_55%_65%)]">{children}</span>
    </div>
  );
}
