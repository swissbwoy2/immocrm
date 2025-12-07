import { useMemo, useState } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
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
  const [isHovered, setIsHovered] = useState(false);
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
  const trendBgColor = trend.direction === 'up' ? 'bg-emerald-500/10' : trend.direction === 'down' ? 'bg-rose-500/10' : 'bg-muted/50';

  const gradientId = `premium-gradient-${title.replace(/\s+/g, '-')}`;
  const glowId = `premium-glow-${title.replace(/\s+/g, '-')}`;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-500",
        "bg-gradient-to-br from-background via-background to-muted/20",
        "border-border/50 hover:border-primary/40",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
        isHovered && "ring-1 ring-primary/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background gradient */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          "bg-gradient-to-br from-primary/5 via-transparent to-primary/3",
          isHovered && "opacity-100"
        )} 
      />
      
      {/* Shine effect */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-700",
          "bg-gradient-to-r from-transparent via-white/5 to-transparent",
          "-translate-x-full group-hover:translate-x-full group-hover:opacity-100",
          "transition-transform duration-1000 ease-out"
        )} 
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full bg-primary/20",
              "animate-pulse"
            )}
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <CardContent className="relative pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                "bg-gradient-to-br from-primary/15 to-primary/5",
                "border border-primary/20",
                "group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20",
                "group-hover:from-primary/25 group-hover:to-primary/10"
              )}
            >
              <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">{valueLabel}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span 
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                  trendBgColor, trendColor,
                  "transition-all duration-300",
                  trend.direction !== 'stable' && "animate-pulse"
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trend.percentage > 0 && `${trend.percentage}%`}
              </span>
              <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {total}
              </span>
            </div>
            {showComparison && comparisonTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                vs {comparisonTotal} période préc.
              </p>
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
                    <div className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-lg px-3 py-2 shadow-xl">
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
                filter={isHovered ? `url(#${glowId})` : undefined}
                name={valueLabel}
                dot={(props) => {
                  const { cx, cy, value } = props;
                  if (value === 0) return null;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 4 : 3}
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
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
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
      </CardContent>
    </Card>
  );
}
