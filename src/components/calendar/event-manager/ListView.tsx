import { memo, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NormalizedEvent } from './useEventManagerData';
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
      <Card className="p-12 text-center border-dashed">
        <CalendarIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">Aucun événement à afficher</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {formatSwissDate(dayEvents[0].date, 'EEEE d MMMM yyyy')}
            </h3>
          </div>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border border-border bg-card',
                  'hover:bg-accent hover:border-primary/40 transition-all',
                  'flex items-start gap-3',
                )}
              >
                <div className={cn('w-1 self-stretch rounded-full', ev.colorClass)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{ev.title}</h4>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ev.typeLabel}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ev.allDay
                      ? 'Toute la journée'
                      : `${formatSwissTime(ev.date)}${ev.endDate ? ` – ${formatSwissTime(ev.endDate)}` : ''}`}
                  </div>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
