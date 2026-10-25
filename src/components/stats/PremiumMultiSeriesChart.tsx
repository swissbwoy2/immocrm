import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { DateRange } from './DateRangeFilter';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { nombreSuisse } from './statsFormat';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface SeriesData {
  key: string;
  label: string;
  color: string;
  data: DataPoint[];
}

interface PremiumMultiSeriesChartProps {
  title: string;
  series: SeriesData[];
  dateRange: DateRange;
  icon?: React.ComponentType<{ className?: string }>;
}

export function PremiumMultiSeriesChart({ 
  title, 
  series, 
  dateRange,
  icon: Icon = Activity 
}: PremiumMultiSeriesChartProps) {
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
      formatStr = 'MMM yy';
      compareFn = isSameMonth;
    }

    return intervals.map((interval) => {
      const point: any = { name: format(interval, formatStr, { locale: fr }) };
      
      series.forEach((s) => {
        const matchingData = s.data.filter((d) => compareFn(d.date, interval));
        point[s.key] = matchingData.reduce((sum, d) => sum + d.value, 0);
      });

      return point;
    });
  }, [series, dateRange, daysDiff]);

  // Calculate totals per series
  const seriesTotals = useMemo(() => {
    return series.map(s => ({
      ...s,
      total: s.data.reduce((sum, d) => sum + d.value, 0)
    }));
  }, [series]);

  const grandTotal = seriesTotals.reduce((sum, s) => sum + s.total, 0);

  // Calculate trend (compare first half to second half)
  const trend = useMemo(() => {
    const midPoint = Math.floor(chartData.length / 2);
    if (midPoint === 0) return { direction: 'neutral' as const, percentage: 0 };
    
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    
    const firstTotal = firstHalf.reduce((sum, point) => {
      return sum + series.reduce((s, ser) => s + (point[ser.key] || 0), 0);
    }, 0);
    
    const secondTotal = secondHalf.reduce((sum, point) => {
      return sum + series.reduce((s, ser) => s + (point[ser.key] || 0), 0);
    }, 0);
    
    if (firstTotal === 0) return { direction: 'up' as const, percentage: 100 };
    
    const change = ((secondTotal - firstTotal) / firstTotal) * 100;
    return {
      direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'neutral' as const,
      percentage: Math.abs(Math.round(change))
    };
  }, [chartData, series]);

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-emerald-700 dark:text-emerald-400' : trend.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={`${DASH_CARD} flex h-full flex-col p-4 md:p-5`}>
      {/* En-tête */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">sur la période</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {nombreSuisse(grandTotal)}
          </p>
          <p className="mt-1 flex items-center justify-end gap-1.5 text-xs">
            <span className={cn("font-medium", trendColor)}>
              <span aria-hidden="true">{trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '–'}</span>
              {trend.percentage > 0 && <span className="tabular-nums"> {trend.percentage} %</span>}
            </span>
            <span className="text-muted-foreground">Total</span>
          </p>
        </div>
      </div>

      {/* Graphique */}
      <div className="mt-auto h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
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
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              itemStyle={{
                padding: '2px 0',
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Légende avec totaux par série */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
        {seriesTotals.map((s) => (
          <div key={s.key} className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <p className="truncate text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{nombreSuisse(s.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
