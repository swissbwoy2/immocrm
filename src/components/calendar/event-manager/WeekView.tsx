import { memo } from 'react';
import { addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
import { eventTypeChipColors, DEFAULT_EVENT_CHIP } from '../types';
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
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/70">
          <div />
          {days.map((day) => {
            const isTodayDate = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'border-l border-border/50 p-2 text-center transition-colors hover:bg-muted/40',
                )}
              >
                <div className="text-xs font-medium capitalize text-muted-foreground">
                  {formatSwissDate(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-foreground',
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
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 last:border-0"
            >
              <div className="-mt-2 py-3 pr-2 text-right text-[11px] tabular-nums text-muted-foreground">
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
                    className="min-h-14 border-l border-border/40 p-1 transition-colors hover:bg-muted/30"
                  >
                    {slotEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          'mb-1 w-full truncate rounded-lg border px-1.5 py-1 text-left text-[11px]',
                          'transition-opacity hover:opacity-80',
                          eventTypeChipColors[ev.type] || DEFAULT_EVENT_CHIP,
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
