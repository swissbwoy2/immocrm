import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'gold' | 'dark';
  asChild?: boolean;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ children, className, variant = 'gold', ...props }, ref) => {
    const base =
      variant === 'gold'
        ? 'bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_54%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)]'
        : 'bg-[hsl(30_15%_10%)] text-[hsl(40_25%_85%)]';

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-sm font-semibold tracking-wide transition-all duration-300',
          'px-8 py-4 text-sm uppercase',
          'luxury-shimmer-btn luxury-cta-glow',
          base,
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ShimmerButton.displayName = 'ShimmerButton';
