import { useMemo } from 'react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { DateRange } from './DateRangeFilter';
import { nombreSuisse, axeSuisse } from './statsFormat';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

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

  const isMontant = valueLabel === 'CHF';

  return (
    <div className={`${DASH_CARD} flex h-full flex-col p-4 md:p-5`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LineChartIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">sur la période</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{nombreSuisse(total)}</p>
          {isMontant && <p className="mt-1 text-xs text-muted-foreground">{valueLabel}</p>}
          {showComparison && comparisonTotal > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              vs {nombreSuisse(comparisonTotal)} période préc.
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto h-[240px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 8, left: isMontant ? -8 : -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
              tickFormatter={(v: number) => axeSuisse(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: number) => [nombreSuisse(value), valueLabel]}
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
              fill={color}
              fillOpacity={0.12}
              name={valueLabel}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
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

  const totals = series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    total: s.data.reduce((sum, d) => sum + d.value, 0),
  }));

  return (
    <div className={`${DASH_CARD} flex h-full flex-col p-4 md:p-5`}>
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart3 className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">sur la période</p>
        </div>
      </div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {totals.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{nombreSuisse(s.total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto h-[240px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
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
    </div>
  );
}
