import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { DateRange } from './DateRangeFilter';
import { TrendingUp, TrendingDown, Minus, Mail, Eye, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface PremiumPerformanceChartProps {
  title: string;
  data: DataPoint[];
  dateRange: DateRange;
  color?: string;
  valueLabel?: string;
  icon?: LucideIcon;
  showComparison?: boolean;
  comparisonData?: DataPoint[];
}

export function PremiumPerformanceChart({
  title,
  data,
  dateRange,
  color = 'hsl(var(--primary))',
  valueLabel = 'Valeur',
  icon: Icon = Mail,
  showComparison = false,
  comparisonData,
}: PremiumPerformanceChartProps) {
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
      
      let comparisonValue = 0;
      if (showComparison && comparisonData) {
        const matchingComparison = comparisonData.filter((d) => {
          const shiftedDate = new Date(d.date);
          shiftedDate.setDate(shiftedDate.getDate() + daysDiff + 1);
          return compareFn(shiftedDate, interval);
        });
        comparisonValue = matchingComparison.reduce((sum, d) => sum + d.value, 0);
      }

      return {
        name: format(interval, formatStr, { locale: fr }),
        value,
        comparison: comparisonValue,
        date: interval,
      };
    });
  }, [data, dateRange, daysDiff, showComparison, comparisonData]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const comparisonTotal = chartData.reduce((sum, d) => sum + d.comparison, 0);
  const average = chartData.length > 0 ? (total / chartData.length).toFixed(1) : '0';
  const maxValue = Math.max(...chartData.map(d => d.value), 0);
  
  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'stable' as const, percentage: 0 };
    const firstHalf = chartData.slice(0, Math.ceil(chartData.length / 2));
    const secondHalf = chartData.slice(Math.ceil(chartData.length / 2));
    const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length;
    
    if (firstAvg === 0 && secondAvg === 0) return { direction: 'stable' as const, percentage: 0 };
    if (firstAvg === 0) return { direction: 'up' as const, percentage: 100 };
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    return {
      direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'stable' as const,
      percentage: Math.abs(Math.round(change)),
    };
  }, [chartData]);

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-emerald-500' : trend.direction === 'down' ? 'text-rose-500' : 'text-muted-foreground';
  
  const gradientId = `premium-gradient-${title.replace(/\s+/g, '-')}`;
  const glowId = `premium-glow-${title.replace(/\s+/g, '-')}`;

  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div>
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
            <span className="text-2xl font-semibold tracking-tight text-foreground">{total}</span>
            {showComparison && comparisonTotal > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">vs {comparisonTotal} période préc.</p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false}
                axisLine={false}
                dy={5}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                dx={-5}
              />
              
              {/* Average reference line */}
              {total > 0 && (
                <ReferenceLine 
                  y={parseFloat(average)} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.3}
                />
              )}
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 shadow-md">
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <p className="text-sm font-bold text-primary">
                        {payload[0].value} {valueLabel}
                      </p>
                    </div>
                  );
                }}
              />
              
              {showComparison && (
                <Area
                  type="monotone"
                  dataKey="comparison"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  fill="transparent"
                  name="Période précédente"
                />
              )}
              
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                                name={valueLabel}
                dot={(props) => {
                  const { cx, cy, value } = props;
                  if (value === 0) return null;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={color}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      className="transition-all duration-300"
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: color,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                  className: 'drop-shadow-lg',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mini stats footer */}
        <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">Moy:</span>
              <span className="font-medium text-foreground">{average}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Max:</span>
              <span className="font-medium text-foreground">{maxValue}</span>
            </div>
          </div>
          
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trendColor
          )}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>
              {trend.direction === 'up' ? 'En hausse' : 
               trend.direction === 'down' ? 'En baisse' : 'Stable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
