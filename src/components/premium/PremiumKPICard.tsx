import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef, memo } from 'react';

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
  const [displayValue, setDisplayValue] = useState(value);
  const frameRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
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
  }, [value]);
  
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

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-card border border-border/50',
        'transition-all duration-300 ease-out',
        'hover:shadow-lg hover:-translate-y-0.5',
        config.glowColor,
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated border gradient - simplified */}
      <div 
        className={cn(
          'absolute inset-0 rounded-xl p-[1px]',
          'bg-gradient-to-r opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          config.borderGradient
        )}
      />
      
      {/* Content */}
      <div className="relative p-3 sm:p-4 lg:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate">
              {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
            </h3>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2 sm:p-2.5 lg:p-3 rounded-xl flex-shrink-0',
            'transition-transform duration-300 group-hover:scale-105',
            config.iconBg
          )}>
            <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6', config.iconColor)} />
          </div>
        </div>
      </div>
    </div>
  );
});
