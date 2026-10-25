import { LucideIcon } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
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

/** Tuile KPI sobre : pastille d'icône, grande valeur, libellé, sous-texte, variation ▲▼ éventuelle. */
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

  const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
  };

  const trendArrow = calculatedTrend === 'up' ? '▲' : calculatedTrend === 'down' ? '▼' : '–';
  const trendColor = calculatedTrend === 'up'
    ? 'text-emerald-700 dark:text-emerald-400'
    : calculatedTrend === 'down'
    ? 'text-destructive'
    : 'text-muted-foreground';

  return (
    <div
      className={cn(
        DASH_CARD,
        'flex h-full min-h-[120px] min-w-0 flex-col justify-between p-3 sm:p-4',
        onClick && 'cursor-pointer transition-transform duration-150 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconVariantStyles[variant])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="mt-3 min-w-0">
        <p className="truncate text-xl font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-2xl">
          {value}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-foreground sm:text-sm">{title}</p>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
        {calculatedTrendValue && (
          <p className={cn('mt-0.5 flex min-w-0 items-center gap-1 text-xs font-medium', trendColor)}>
            <span aria-hidden="true">{trendArrow}</span>
            <span className="tabular-nums">{calculatedTrendValue.replace('%', ' %')}</span>
            <span className="hidden truncate font-normal text-muted-foreground sm:inline">vs période préc.</span>
          </p>
        )}
      </div>
    </div>
  );
}
