import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from './DateRangeFilter';

interface DataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface PerformanceChartProps {
  title: string;
  data: DataPoint[];
  dateRange: DateRange;
  color?: string;
  valueLabel?: string;
  showComparison?: boolean;
  comparisonData?: DataPoint[];
}

export function PerformanceChart({
  title,
  data,
  dateRange,
  color = 'hsl(var(--primary))',
  valueLabel = 'Valeur',
  showComparison = false,
  comparisonData,
}: PerformanceChartProps) {
  const daysDiff = differenceInDays(dateRange.to, dateRange.from);
  
  const chartData = useMemo(() => {
    // Determine granularity based on date range
    let intervals: Date[];
    let formatStr: string;
    let compareFn: (d1: Date, d2: Date) => boolean;

    if (daysDiff <= 7) {
      // Daily for up to 7 days
      intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      formatStr = 'EEE dd';
      compareFn = isSameDay;
    } else if (daysDiff <= 90) {
      // Weekly for up to 3 months
      intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { weekStartsOn: 1 });
      formatStr = "'S'w";
      compareFn = (d1, d2) => isSameWeek(d1, d2, { weekStartsOn: 1 });
    } else {
      // Monthly for longer periods
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
          // Shift comparison date forward by the period length
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

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-primary/10 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium transition-transform duration-300 group-hover:scale-[1.02] origin-left">{title}</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold">{total}</p>
            {showComparison && comparisonTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                vs {comparisonTotal} période préc.
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value, valueLabel]}
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
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                name={valueLabel}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface MultiSeriesChartProps {
  title: string;
  series: {
    key: string;
    label: string;
    color: string;
    data: DataPoint[];
  }[];
  dateRange: DateRange;
}

export function MultiSeriesChart({ title, series, dateRange }: MultiSeriesChartProps) {
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

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-primary/10 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium transition-transform duration-300 group-hover:scale-[1.02] origin-left">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
