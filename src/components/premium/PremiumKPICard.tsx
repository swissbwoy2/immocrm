import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef, memo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface PremiumKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  onClick?: () => void;
  delay?: number;
}

const AnimatedNumber = memo(function AnimatedNumber({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const frameRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Respect prefers-reduced-motion: no counting animation at all
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Only animate once on mount, not on every value change
    if (hasAnimated.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimated.current = true;
    const duration = 800;
    const startTime = performance.now();
    const start = startValueRef.current;
    const end = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, prefersReducedMotion]);

  return <span>{displayValue.toLocaleString()}</span>;
});

export const PremiumKPICard = memo(function PremiumKPICard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default', 
  subtitle, 
  onClick,
  delay = 0 
}: PremiumKPICardProps) {
  const numericValue = typeof value === 'number' ? value : null;
  
  const variantConfig = {
    default: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      glowColor: 'group-hover:shadow-primary/20',
      borderGradient: 'from-primary/40 via-primary/20 to-primary/40',
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      glowColor: 'group-hover:shadow-success/20',
      borderGradient: 'from-success/40 via-emerald-400/20 to-success/40',
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      glowColor: 'group-hover:shadow-warning/20',
      borderGradient: 'from-warning/40 via-orange-400/20 to-warning/40',
    },
    danger: {
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      glowColor: 'group-hover:shadow-destructive/20',
      borderGradient: 'from-destructive/40 via-red-400/20 to-destructive/40',
    },
  };

  const config = variantConfig[variant];

  const shellClass = cn(
    'group relative overflow-hidden rounded-xl w-full h-full text-left',
    'min-h-[96px] sm:min-h-[108px]',
    'bg-card border border-border/50',
    'transition-all duration-300 ease-out',
    'hover:shadow-lg motion-safe:hover:-translate-y-0.5',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    config.glowColor,
    onClick && 'cursor-pointer'
  );

  const inner = (
    <>
      {/* Animated border gradient - simplified */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl p-[1px] pointer-events-none',
          'bg-gradient-to-r opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          config.borderGradient
        )}
      />

      {/* Content */}
      <div className="relative h-full p-3 sm:p-4 lg:p-5">
        <div className="flex h-full items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight break-words line-clamp-2">
              {title}
            </p>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 tabular-nums leading-tight break-words">
              {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
            </h3>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2 sm:p-2.5 lg:p-3 rounded-xl flex-shrink-0',
            'transition-transform duration-300 motion-safe:group-hover:scale-105',
            config.iconBg
          )}>
            <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6', config.iconColor)} />
          </div>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shellClass, 'appearance-none bg-card')}
        style={{ animationDelay: `${delay}ms` }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={shellClass} style={{ animationDelay: `${delay}ms` }}>
      {inner}
    </div>
  );
});
