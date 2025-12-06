import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  previousValue,
  currentValue,
  icon: Icon,
  description,
  trend,
  trendValue,
  variant = 'default',
  className,
  onClick,
}: StatsCardProps) {
  // Calculate trend automatically if previousValue and currentValue are provided
  let calculatedTrend = trend;
  let calculatedTrendValue = trendValue;
  
  if (previousValue !== undefined && currentValue !== undefined && !trend) {
    if (previousValue === 0) {
      calculatedTrend = currentValue > 0 ? 'up' : 'neutral';
      calculatedTrendValue = currentValue > 0 ? '+100%' : '0%';
    } else {
      const percentChange = ((currentValue - previousValue) / previousValue) * 100;
      calculatedTrend = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
      calculatedTrendValue = `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`;
    }
  }

  const gradientClasses = {
    default: 'kpi-gradient-default',
    success: 'kpi-gradient-success',
    warning: 'kpi-gradient-warning',
    danger: 'kpi-gradient-danger',
  };

  const borderClasses = {
    default: 'border-primary/20 hover:border-primary/40',
    success: 'border-success/20 hover:border-success/40',
    warning: 'border-warning/20 hover:border-warning/40',
    danger: 'border-destructive/20 hover:border-destructive/40',
  };

  const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  const TrendIcon = calculatedTrend === 'up' ? TrendingUp : calculatedTrend === 'down' ? TrendingDown : Minus;
  const trendColor = calculatedTrend === 'up' ? 'text-success' : calculatedTrend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card 
      className={cn(
        'group relative overflow-hidden transition-all duration-300 ease-out',
        'hover:shadow-lg hover:-translate-y-1',
        borderClasses[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        gradientClasses[variant]
      )} />
      
      <CardContent className="relative p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={cn(
              "text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate",
              "transition-transform duration-300 group-hover:scale-105 origin-left"
            )}>
              {value}
            </p>
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
            {calculatedTrendValue && (
              <div className={cn("flex items-center gap-1 mt-1.5 text-[10px] sm:text-xs", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span className="font-medium">{calculatedTrendValue}</span>
                <span className="text-muted-foreground hidden sm:inline">vs période préc.</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
            "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
