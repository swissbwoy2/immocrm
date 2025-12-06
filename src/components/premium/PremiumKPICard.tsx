import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface PremiumKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  onClick?: () => void;
  delay?: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const duration = 1000;
    const start = 0;
    const end = value;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeOut);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span ref={ref}>{displayValue.toLocaleString()}</span>;
}

export function PremiumKPICard({ 
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
      particleColor: 'bg-primary/30',
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      glowColor: 'group-hover:shadow-success/20',
      borderGradient: 'from-success/40 via-emerald-400/20 to-success/40',
      particleColor: 'bg-success/30',
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      glowColor: 'group-hover:shadow-warning/20',
      borderGradient: 'from-warning/40 via-orange-400/20 to-warning/40',
      particleColor: 'bg-warning/30',
    },
    danger: {
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      glowColor: 'group-hover:shadow-destructive/20',
      borderGradient: 'from-destructive/40 via-red-400/20 to-destructive/40',
      particleColor: 'bg-destructive/30',
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-card border border-border/50',
        'transition-all duration-500 ease-out',
        'hover:shadow-xl hover:-translate-y-1',
        config.glowColor,
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated border gradient */}
      <div 
        className={cn(
          'absolute inset-0 rounded-xl p-[1px]',
          'bg-gradient-to-r opacity-0 group-hover:opacity-100',
          'transition-opacity duration-500',
          config.borderGradient
        )}
      />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-background/80 to-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Floating particles on hover */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className={cn('absolute w-2 h-2 rounded-full blur-sm animate-float', config.particleColor)} style={{ top: '20%', left: '10%', animationDelay: '0s' }} />
        <div className={cn('absolute w-1.5 h-1.5 rounded-full blur-sm animate-float', config.particleColor)} style={{ top: '60%', right: '15%', animationDelay: '0.5s' }} />
        <div className={cn('absolute w-1 h-1 rounded-full blur-sm animate-float', config.particleColor)} style={{ bottom: '20%', left: '30%', animationDelay: '1s' }} />
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      {/* Content */}
      <div className="relative p-3 sm:p-4 lg:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate transition-transform duration-300 group-hover:scale-105 origin-left">
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
            'transition-all duration-500 group-hover:scale-110 group-hover:rotate-6',
            config.iconBg
          )}>
            <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6', config.iconColor)} />
          </div>
        </div>
      </div>
    </div>
  );
}
