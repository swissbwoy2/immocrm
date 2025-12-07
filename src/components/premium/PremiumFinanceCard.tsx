import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface PremiumFinanceCardProps {
  title: string;
  value: number;
  currency?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info';
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
  className?: string;
}

export function PremiumFinanceCard({
  title,
  value,
  currency = 'CHF',
  icon: Icon,
  variant = 'default',
  badge,
  trend,
  delay = 0,
  className
}: PremiumFinanceCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Animate value on mount
  useEffect(() => {
    const visibilityTimer = setTimeout(() => setIsVisible(true), delay);
    
    const animationTimer = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setAnimatedValue(value);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(interval);
    }, delay + 100);
    
    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(animationTimer);
    };
  }, [value, delay]);
  
  const variantStyles = {
    default: {
      bg: 'from-primary/10 via-primary/5 to-transparent',
      border: 'border-primary/20',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-foreground',
      particle: 'bg-primary/30'
    },
    success: {
      bg: 'from-green-500/10 via-green-500/5 to-transparent',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
      valueColor: 'text-green-600 dark:text-green-400',
      particle: 'bg-green-500/30'
    },
    warning: {
      bg: 'from-orange-500/10 via-orange-500/5 to-transparent',
      border: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
      valueColor: 'text-orange-600 dark:text-orange-400',
      particle: 'bg-orange-500/30'
    },
    info: {
      bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
      valueColor: 'text-blue-600 dark:text-blue-400',
      particle: 'bg-blue-500/30'
    }
  };
  
  const styles = variantStyles[variant];
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br',
        styles.bg,
        'backdrop-blur-xl border',
        styles.border,
        'p-5 shadow-lg',
        'group hover:shadow-xl hover:-translate-y-1',
        'transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={cn(
          'absolute inset-[-1px] rounded-xl bg-gradient-to-r animate-gradient-x',
          variant === 'default' ? 'from-primary/50 via-accent/50 to-primary/50' :
          variant === 'success' ? 'from-green-500/50 via-emerald-500/50 to-green-500/50' :
          variant === 'warning' ? 'from-orange-500/50 via-amber-500/50 to-orange-500/50' :
          'from-blue-500/50 via-cyan-500/50 to-blue-500/50'
        )} />
        <div className="absolute inset-[1px] rounded-xl bg-card" />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute w-1 h-1 rounded-full animate-float',
              styles.particle
            )}
            style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 30}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('p-1.5 rounded-lg transition-transform group-hover:scale-110', styles.iconBg)}>
            <Icon className={cn('w-4 h-4', styles.iconColor)} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        
        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold tabular-nums', styles.valueColor)}>
            {animatedValue.toLocaleString('fr-CH')}
          </span>
          <span className={cn('text-sm font-medium', styles.valueColor)}>
            {currency}
          </span>
        </div>
        
        {/* Badge */}
        {badge && (
          <Badge 
            variant="secondary" 
            className={cn(
              'mt-2 text-xs',
              variant === 'success' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
              variant === 'warning' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300' :
              variant === 'info' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
              'bg-primary/20 text-primary'
            )}
          >
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}
