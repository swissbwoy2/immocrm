import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  status?: string;
  priority?: string;
  agent_id?: string;
  client_id?: string;
  description?: string;
  all_day?: boolean;
  end_date?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  visites: any[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500',
  rappel: 'bg-yellow-500',
  rendez_vous: 'bg-green-500',
  tache: 'bg-orange-500',
  reunion: 'bg-purple-500',
  autre: 'bg-gray-500',
};

export function CalendarView({ events, visites, selectedDate, onDateSelect }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad days to start from Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const getEventsForDay = (date: Date) => {
    const dayEvents: { type: string; event: any }[] = [];

    // Add calendar events
    events.forEach((event) => {
      if (isSameDay(new Date(event.event_date), date)) {
        dayEvents.push({ type: event.event_type, event });
      }
    });

    // Add visites
    visites.forEach((visite) => {
      if (isSameDay(new Date(visite.date_visite), date)) {
        dayEvents.push({ type: 'visite', event: visite });
      }
    });

    return dayEvents;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for days before month starts */}
        {Array.from({ length: paddingDays }).map((_, index) => (
          <div key={`padding-${index}`} className="h-24 bg-muted/30 rounded" />
        ))}

        {/* Actual days */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'h-24 p-1 rounded border cursor-pointer transition-colors hover:bg-accent/50',
                !isSameMonth(day, currentMonth) && 'opacity-50',
                isToday(day) && 'border-primary border-2',
                isSelected && 'bg-accent ring-2 ring-primary'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-1',
                isToday(day) && 'text-primary'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'text-[10px] px-1 py-0.5 rounded truncate text-white',
                      eventTypeColors[item.type] || 'bg-gray-500'
                    )}
                  >
                    {item.event.title || item.event.adresse?.substring(0, 15)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
        <div className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded', eventTypeColors.visite)} />
          <span className="text-xs text-muted-foreground">Visite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded', eventTypeColors.rappel)} />
          <span className="text-xs text-muted-foreground">Rappel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded', eventTypeColors.rendez_vous)} />
          <span className="text-xs text-muted-foreground">RDV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded', eventTypeColors.tache)} />
          <span className="text-xs text-muted-foreground">Tâche</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded', eventTypeColors.reunion)} />
          <span className="text-xs text-muted-foreground">Réunion</span>
        </div>
      </div>
    </div>
  );
}
