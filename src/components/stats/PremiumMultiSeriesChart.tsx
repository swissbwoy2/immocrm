import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from './DateRangeFilter';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const trendColor = trend.direction === 'up' ? 'text-emerald-500' : trend.direction === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <Card className="group relative overflow-hidden border-primary/10 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
      {/* Glassmorphism background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20 animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <CardTitle className="text-base font-semibold transition-transform duration-300 group-hover:scale-[1.02] origin-left">
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {trend.percentage > 0 && <span>{trend.percentage}%</span>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {grandTotal}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {/* Chart */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
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
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                  backdropFilter: 'blur(8px)',
                }}
                itemStyle={{
                  padding: '2px 0',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={`url(#gradient-${s.key})`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Series totals footer */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-3">
            {seriesTotals.map((s, i) => (
              <div 
                key={s.key}
                className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: s.color }}
                  />
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>
                  {s.total}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </Card>
  );
}
