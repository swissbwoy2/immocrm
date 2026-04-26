import { memo } from 'react';
import { addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
import { formatSwissDate, formatSwissTime } from '@/lib/dateUtils';

interface WeekViewProps {
  currentDate: Date;
  events: NormalizedEvent[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: NormalizedEvent) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h → 20h

export const WeekView = memo(function WeekView({
  currentDate,
  events,
  onDateSelect,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div />
          {days.map((day) => {
            const isTodayDate = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'p-2 text-center hover:bg-muted/50 transition-colors border-l border-border',
                  isTodayDate && 'bg-primary/5',
                )}
              >
                <div className="text-xs uppercase text-muted-foreground">
                  {formatSwissDate(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full',
                    isTodayDate && 'bg-primary text-primary-foreground',
                  )}
                >
                  {formatSwissDate(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Hours grid */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50"
            >
              <div className="text-xs text-muted-foreground text-right pr-2 py-3 -mt-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day) => {
                const slotEvents = events.filter((ev) => {
                  if (!isSameDay(ev.date, day)) return false;
                  if (ev.allDay) return hour === 7;
                  return ev.date.getHours() === hour;
                });
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-l border-border/50 min-h-14 p-1 hover:bg-muted/30 transition-colors"
                  >
                    {slotEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          'w-full text-left text-[11px] px-1.5 py-1 rounded text-white mb-1 truncate',
                          'hover:opacity-90 transition-opacity',
                          ev.colorClass,
                        )}
                        title={ev.title}
                      >
                        <div className="font-semibold">
                          {!ev.allDay ? formatSwissTime(ev.date) : 'Toute la journée'}
                        </div>
                        <div className="truncate">{ev.title}</div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
