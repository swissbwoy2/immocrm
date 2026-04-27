import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, subMonths, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presetRanges = [
  { label: "Aujourd'hui", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Hier", getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "7 derniers jours", getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "30 derniers jours", getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Cette semaine", getValue: () => ({ from: startOfDay(startOfWeek(new Date(), { weekStartsOn: 1 })), to: endOfDay(endOfWeek(new Date(), { weekStartsOn: 1 })) }) },
  { label: "Ce mois", getValue: () => ({ from: startOfDay(startOfMonth(new Date())), to: endOfDay(endOfMonth(new Date())) }) },
  { label: "Mois dernier", getValue: () => ({ from: startOfDay(startOfMonth(subMonths(new Date(), 1))), to: endOfDay(endOfMonth(subMonths(new Date(), 1))) }) },
  { label: "Ce trimestre", getValue: () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    return { from: startOfDay(start), to: endOfDay(end) };
  }},
  { label: "Cette année", getValue: () => ({ from: startOfDay(startOfYear(new Date())), to: endOfDay(endOfYear(new Date())) }) },
  { label: "Année dernière", getValue: () => ({ from: startOfDay(startOfYear(subYears(new Date(), 1))), to: endOfDay(endOfYear(subYears(new Date(), 1))) }) },
];

// Generate years from 2016 to current year
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2016; year--) {
    years.push({
      label: `Année ${year}`,
      getValue: () => ({ from: startOfDay(new Date(year, 0, 1)), to: endOfDay(new Date(year, 11, 31)) })
    });
  }
  return years;
};

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue();
    onChange({ ...range, label: preset.label });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({
        from: customFrom,
        to: customTo,
        label: `${format(customFrom, 'dd/MM/yyyy')} - ${format(customTo, 'dd/MM/yyyy')}`
      });
      setShowCustomCalendar(false);
    }
  };

  const yearOptions = generateYearOptions();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm">{value.label}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {presetRanges.map((preset) => (
            <DropdownMenuItem
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
              className={cn(value.label === preset.label && "bg-accent")}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCustomCalendar(true)}>
            Période personnalisée...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {yearOptions.slice(0, 5).map((year) => (
            <DropdownMenuItem
              key={year.label}
              onClick={() => handlePresetSelect(year)}
              className={cn(value.label === year.label && "bg-accent")}
            >
              {year.label}
            </DropdownMenuItem>
          ))}
          {yearOptions.length > 5 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem>
                  Plus d'années...
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right">
                {yearOptions.slice(5).map((year) => (
                  <DropdownMenuItem
                    key={year.label}
                    onClick={() => handlePresetSelect(year)}
                  >
                    {year.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={showCustomCalendar} onOpenChange={setShowCustomCalendar}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Date de début</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  locale={fr}
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Date de fin</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  locale={fr}
                  disabled={(date) => date > new Date() || (customFrom && date < customFrom)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustomCalendar(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
                Appliquer
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  return {
    from: subDays(new Date(), 29),
    to: new Date(),
    label: "30 derniers jours"
  };
}
