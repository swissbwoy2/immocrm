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
        ? 'bg-gradient-to-r from-primary via-primary to-primary text-foreground'
        : 'bg-background text-muted-foreground';

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
