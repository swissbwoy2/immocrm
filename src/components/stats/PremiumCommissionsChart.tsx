import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { DateRange } from './DateRangeFilter';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { nombreSuisse, axeSuisse } from './statsFormat';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface PremiumCommissionsChartProps {
  title: string;
  data: DataPoint[];
  dateRange: DateRange;
  color?: string;
  valueLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function PremiumCommissionsChart({
  title,
  data,
  dateRange,
  color = 'hsl(142, 76%, 36%)',
  valueLabel = 'CHF',
  icon: Icon = DollarSign,
}: PremiumCommissionsChartProps) {
  const daysDiff = differenceInDays(dateRange.to, dateRange.from);
  
  const chartData = useMemo(() => {
    let intervals: Date[];
    let formatStr: string;
    let compareFn: (d1: Date, d2: Date) => boolean;

    if (daysDiff <= 7) {
      intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      formatStr = 'EEE dd';
      compareFn = isSameDay;
    } else if (daysDiff <= 90) {
      intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { weekStartsOn: 1 });
      formatStr = "'S'w";
      compareFn = (d1, d2) => isSameWeek(d1, d2, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      formatStr = 'MMM yyyy';
      compareFn = isSameMonth;
    }

    return intervals.map((interval) => {
      const matchingData = data.filter((d) => compareFn(d.date, interval));
      const value = matchingData.reduce((sum, d) => sum + d.value, 0);

      return {
        name: format(interval, formatStr, { locale: fr }),
        value,
        date: interval,
      };
    });
  }, [data, dateRange, daysDiff]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const average = chartData.length > 0 ? Math.round(total / chartData.length) : 0;
  const maxValue = Math.max(...chartData.map(d => d.value), 0);

  // Calculate trend
  const trend = useMemo(() => {
    const midPoint = Math.floor(chartData.length / 2);
    if (midPoint === 0) return { direction: 'neutral' as const, percentage: 0 };
    
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    
    const firstTotal = firstHalf.reduce((sum, d) => sum + d.value, 0);
    const secondTotal = secondHalf.reduce((sum, d) => sum + d.value, 0);
    
    if (firstTotal === 0) return { direction: 'up' as const, percentage: 100 };
    
    const change = ((secondTotal - firstTotal) / firstTotal) * 100;
    return {
      direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'neutral' as const,
      percentage: Math.abs(Math.round(change))
    };
  }, [chartData]);

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-emerald-700 dark:text-emerald-400' : trend.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={`${DASH_CARD} flex h-full flex-col p-4 md:p-5`}>
      {/* En-tête */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            <p className="truncate text-xs text-muted-foreground">{dateRange.label}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {nombreSuisse(total)}
          </p>
          <p className="mt-1 flex items-center justify-end gap-1.5 text-xs">
            <span className={cn("font-medium", trendColor)}>
              <span aria-hidden="true">{trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '–'}</span>
              {trend.percentage > 0 && <span className="tabular-nums"> {trend.percentage} %</span>}
            </span>
            <span className="text-muted-foreground">{valueLabel}</span>
          </p>
        </div>
      </div>

      {/* Graphique */}
      <div className="mt-auto h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="hsl(var(--border))" 
            />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              tickLine={false}
              axisLine={false}
              minTickGap={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(value: number) => axeSuisse(value)}
            />
            <Tooltip
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [`${nombreSuisse(value)} ${valueLabel}`, title]}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.12}
              dot={false}
              activeDot={{ 
                r: 5, 
                fill: color, 
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Synthèse */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">Moyenne</p>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">
            {nombreSuisse(average)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">Maximum</p>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">
            {nombreSuisse(maxValue)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">Tendance</p>
          <div className={cn("mt-0.5 flex items-center gap-1 text-sm font-medium", trendColor)}>
            <TrendIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{trend.direction === 'up' ? 'Hausse' : trend.direction === 'down' ? 'Baisse' : 'Stable'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
