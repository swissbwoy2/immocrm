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

  const variantStyles = {
    default: 'border-border',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
  };

  const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600',
    warning: 'bg-yellow-500/10 text-yellow-600',
    danger: 'bg-red-500/10 text-red-600',
  };

  const TrendIcon = calculatedTrend === 'up' ? TrendingUp : calculatedTrend === 'down' ? TrendingDown : Minus;
  const trendColor = calculatedTrend === 'up' ? 'text-green-600' : calculatedTrend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className={cn('overflow-hidden', variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {calculatedTrendValue && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{calculatedTrendValue}</span>
                <span className="text-muted-foreground">vs période préc.</span>
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", iconVariantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
