import { memo, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
import { eventTypeChipColors, DEFAULT_EVENT_CHIP } from '../types';
import { formatSwissDate, formatSwissTime, getSwissDateString } from '@/lib/dateUtils';
import { Calendar as CalendarIcon } from 'lucide-react';

interface ListViewProps {
  events: NormalizedEvent[];
  onEventClick: (event: NormalizedEvent) => void;
}

export const ListView = memo(function ListView({ events, onEventClick }: ListViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, NormalizedEvent[]>();
    [...events]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((ev) => {
        const key = getSwissDateString(ev.date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      });
    return Array.from(map.entries());
  }, [events]);

  if (grouped.length === 0) {
    return (
      <Card className="rounded-2xl border-border/70 px-6 py-12 text-center shadow-none">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CalendarIcon className="h-7 w-7 text-primary" />
        </span>
        <p className="text-sm text-muted-foreground">Aucun événement à afficher</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <div className="sticky top-0 z-10 mb-2 bg-card py-2">
            <h3 className="text-base font-semibold capitalize text-foreground">
              {formatSwissDate(dayEvents[0].date, 'EEEE d MMMM yyyy')}
            </h3>
          </div>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  'w-full rounded-2xl border border-border/70 bg-card p-3 text-left sm:p-4',
                  'shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)]',
                  'transition-colors hover:border-foreground/30',
                  'flex items-start gap-3',
                )}
              >
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', ev.colorClass)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="truncate text-sm font-semibold text-foreground">{ev.title}</h4>
                    <Badge variant="outline" className={cn('shrink-0 rounded-full text-[10px] font-medium', eventTypeChipColors[ev.type] || DEFAULT_EVENT_CHIP)}>
                      {ev.typeLabel}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ev.allDay
                      ? 'Toute la journée'
                      : `${formatSwissTime(ev.date)}${ev.endDate ? ` – ${formatSwissTime(ev.endDate)}` : ''}`}
                  </div>
                  {ev.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {ev.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
