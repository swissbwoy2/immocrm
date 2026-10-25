import { memo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent, indexByDay } from './useEventManagerData';
import { eventTypeChipColors, DEFAULT_EVENT_CHIP } from '../types';
import { formatSwissDate, formatSwissTime, getSwissDateString } from '@/lib/dateUtils';

interface MonthViewProps {
  currentDate: Date;
  events: NormalizedEvent[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: NormalizedEvent) => void;
}

export const MonthView = memo(function MonthView({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const eventsByDay = indexByDay(events);

  return (
    <div className="w-full">
      {/* Week days header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-[11px] font-medium sm:text-xs',
              idx >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: paddingDays }).map((_, i) => (
          <div key={`pad-${i}`} className="h-20 rounded-xl sm:h-24 md:h-28" />
        ))}

        {days.map((day) => {
          const dateKey = getSwissDateString(day);
          const dayEvents = eventsByDay.get(dateKey) || [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isTodayDate = isToday(day);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const inMonth = isSameMonth(day, currentDate);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'group relative h-20 min-w-0 cursor-pointer rounded-xl border border-border/70 bg-card p-1 text-left transition-colors duration-150 sm:h-24 sm:p-1.5 md:h-28',
                'hover:border-foreground/30',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                !inMonth && 'opacity-40',
                isWeekend && inMonth && 'bg-muted/30',
                isTodayDate && 'border-primary/40',
                isSelected && 'border-foreground bg-muted/50',
              )}
            >
              <div
                className={cn(
                  'mb-1 flex items-center justify-between text-xs font-medium text-foreground',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1',
                    isTodayDate && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {formatSwissDate(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className={cn(
                      'cursor-pointer truncate rounded-md border px-1 py-0.5 text-[10px] leading-tight sm:px-1.5',
                      'transition-opacity hover:opacity-80',
                      eventTypeChipColors[ev.type] || DEFAULT_EVENT_CHIP,
                    )}
                    title={`${ev.typeLabel} — ${ev.title}`}
                  >
                    {!ev.allDay && (
                      <span className="mr-1 font-semibold">{formatSwissTime(ev.date)}</span>
                    )}
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="pl-1 text-[10px] font-medium text-muted-foreground">
                    +{dayEvents.length - 3} de plus
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
