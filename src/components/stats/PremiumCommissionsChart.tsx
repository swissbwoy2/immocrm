import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from './DateRangeFilter';
import { DollarSign, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
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
  const trendColor = trend.direction === 'up' ? 'text-emerald-500' : trend.direction === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <Card className="group relative overflow-hidden border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10">
      {/* Glassmorphism background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${3 + (i % 3)}px`,
              height: `${3 + (i % 3)}px`,
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              backgroundColor: 'hsl(142 76% 36% / 0.2)',
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${2 + i * 0.3}s`
            }}
          />
        ))}
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-emerald-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors duration-300">
              <Icon className="h-5 w-5 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{dateRange.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", 
              trend.direction === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 
              trend.direction === 'down' ? 'bg-rose-500/10 text-rose-500' : 
              'bg-muted text-muted-foreground'
            )}>
              <TrendIcon className="h-3 w-3" />
              {trend.percentage > 0 && <span>{trend.percentage}%</span>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{valueLabel}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="commissionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="hsl(var(--muted-foreground) / 0.1)" 
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
              />
              <Tooltip
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 40px -10px hsl(142 76% 36% / 0.3)',
                  backdropFilter: 'blur(8px)',
                }}
                formatter={(value: number) => [`${value.toLocaleString()} ${valueLabel}`, title]}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill="url(#commissionsGradient)"
                dot={false}
                activeDot={{ 
                  r: 6, 
                  fill: color, 
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                  filter: 'url(#glow)'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats footer */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <p className="text-xs text-muted-foreground mb-1">Moyenne</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {average.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <p className="text-xs text-muted-foreground mb-1">Maximum</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {maxValue.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <p className="text-xs text-muted-foreground mb-1">Tendance</p>
              <div className={cn("flex items-center justify-center gap-1 text-sm font-medium", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{trend.direction === 'up' ? 'Hausse' : trend.direction === 'down' ? 'Baisse' : 'Stable'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </Card>
  );
}
