import { memo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent, indexByDay } from './useEventManagerData';
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
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-semibold py-2 uppercase tracking-wide',
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
          <div key={`pad-${i}`} className="h-24 md:h-28 bg-muted/10 rounded-lg" />
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
                'group relative h-24 md:h-28 p-1.5 rounded-lg border text-left transition-all duration-200 cursor-pointer',
                'bg-card/50 hover:bg-card hover:border-primary/40 hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-primary/40',
                !inMonth && 'opacity-40',
                isWeekend && inMonth && 'bg-muted/30',
                isTodayDate && 'border-primary border-2 bg-primary/5',
                isSelected && 'ring-2 ring-primary bg-accent',
              )}
            >
              <div
                className={cn(
                  'text-xs font-semibold mb-1 flex items-center justify-between',
                  isTodayDate && 'text-primary',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full',
                    isTodayDate && 'bg-primary text-primary-foreground',
                  )}
                >
                  {formatSwissDate(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
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
                      'text-[10px] px-1.5 py-0.5 rounded text-white truncate cursor-pointer',
                      'hover:opacity-90 transition-opacity',
                      ev.colorClass,
                    )}
                    title={`${ev.typeLabel} — ${ev.title}`}
                  >
                    {!ev.allDay && (
                      <span className="font-medium mr-1">{formatSwissTime(ev.date)}</span>
                    )}
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium pl-1">
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
