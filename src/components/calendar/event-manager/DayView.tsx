import { memo } from 'react';
import { isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
import { eventTypeChipColors, DEFAULT_EVENT_CHIP } from '../types';
import { formatSwissTime } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';

interface DayViewProps {
  currentDate: Date;
  events: NormalizedEvent[];
  onEventClick: (event: NormalizedEvent) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7h → 23h

export const DayView = memo(function DayView({
  currentDate,
  events,
  onEventClick,
}: DayViewProps) {
  const dayEvents = events.filter((ev) => isSameDay(ev.date, currentDate));
  const allDayEvents = dayEvents.filter((ev) => ev.allDay);

  return (
    <div className="w-full">
      {allDayEvents.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border/70 bg-card p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Toute la journée
          </div>
          <div className="space-y-1">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  'w-full rounded-lg border px-2.5 py-1.5 text-left text-sm',
                  'transition-opacity hover:opacity-80',
                  eventTypeChipColors[ev.type] || DEFAULT_EVENT_CHIP,
                )}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70">
        {HOURS.map((hour) => {
          const slotEvents = dayEvents.filter(
            (ev) => !ev.allDay && ev.date.getHours() === hour,
          );
          return (
            <div
              key={hour}
              className="grid min-h-16 grid-cols-[56px_1fr] border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20 sm:grid-cols-[80px_1fr]"
            >
              <div className="border-r border-border/40 py-2 pr-2 text-right text-[11px] tabular-nums text-muted-foreground sm:pr-3">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="p-2 space-y-1">
                {slotEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      'w-full rounded-xl border p-2.5 text-left text-sm',
                      'transition-opacity hover:opacity-80',
                      eventTypeChipColors[ev.type] || DEFAULT_EVENT_CHIP,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-xs">
                        {formatSwissTime(ev.date)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-full border-0 bg-background/70 px-2 py-0 text-[10px] font-medium text-foreground"
                      >
                        {ev.typeLabel}
                      </Badge>
                    </div>
                    <div className="font-medium text-foreground">{ev.title}</div>
                    {ev.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ev.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
