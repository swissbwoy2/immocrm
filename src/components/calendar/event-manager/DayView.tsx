import { memo } from 'react';
import { isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
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
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">
            Toute la journée
          </div>
          <div className="space-y-1">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-white text-sm',
                  'hover:opacity-90 transition-opacity',
                  ev.colorClass,
                )}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        {HOURS.map((hour) => {
          const slotEvents = dayEvents.filter(
            (ev) => !ev.allDay && ev.date.getHours() === hour,
          );
          return (
            <div
              key={hour}
              className="grid grid-cols-[80px_1fr] border-b border-border/50 last:border-0 min-h-16 hover:bg-muted/20 transition-colors"
            >
              <div className="text-xs text-muted-foreground text-right pr-3 py-2 border-r border-border/50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="p-2 space-y-1">
                {slotEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      'w-full text-left p-2 rounded text-white text-sm',
                      'hover:opacity-90 transition-opacity',
                      ev.colorClass,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-xs">
                        {formatSwissTime(ev.date)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 h-4 bg-white/20 text-white border-0"
                      >
                        {ev.typeLabel}
                      </Badge>
                    </div>
                    <div className="font-medium">{ev.title}</div>
                    {ev.description && (
                      <div className="text-xs opacity-90 mt-0.5 line-clamp-1">
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
