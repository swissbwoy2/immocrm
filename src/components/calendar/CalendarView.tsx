import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
  onEventClick?: (event: any, type: 'event' | 'visite') => void;
}

const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500',
  visite_deleguee: 'bg-green-600 ring-2 ring-green-300',
  rappel: 'bg-amber-500',
  rendez_vous: 'bg-emerald-500',
  tache: 'bg-orange-500',
  reunion: 'bg-purple-500',
  signature: 'bg-emerald-600',
  etat_lieux: 'bg-cyan-500',
  autre: 'bg-gray-500',
};

export function CalendarView({ events, visites, selectedDate, onDateSelect, onEventClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad days to start from Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const getEventsForDay = (date: Date) => {
    const dayEvents: { type: string; event: any; isVisite: boolean; isDelegated?: boolean }[] = [];

    // Add calendar events
    events.forEach((event) => {
      if (isSameDay(new Date(event.event_date), date)) {
        dayEvents.push({ type: event.event_type, event, isVisite: false });
      }
    });

    // Group visites by address + time
    const visitesForDay = visites.filter(v => isSameDay(new Date(v.date_visite), date));
    const groupedVisites = new Map<string, any[]>();
    
    visitesForDay.forEach((visite) => {
      const key = `${visite.adresse}-${visite.date_visite}`;
      if (!groupedVisites.has(key)) {
        groupedVisites.set(key, []);
      }
      groupedVisites.get(key)!.push(visite);
    });
    
    // Add ONE event per grouped visit
    groupedVisites.forEach((group) => {
      const firstVisite = group[0];
      dayEvents.push({ 
        type: firstVisite.est_deleguee ? 'visite_deleguee' : 'visite', 
        event: { ...firstVisite, groupedClients: group },
        isVisite: true,
        isDelegated: firstVisite.est_deleguee 
      });
    });

    return dayEvents;
  };

  const handleEventClick = (e: React.MouseEvent, item: { event: any; isVisite: boolean }) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(item.event, item.isVisite ? 'visite' : 'event');
    }
  };

  const getEventTime = (item: { event: any; isVisite: boolean }) => {
    const dateStr = item.isVisite ? item.event.date_visite : item.event.event_date;
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    // Check if it's all day event
    if (!item.isVisite && item.event.all_day) return '';
    
    return format(date, 'HH:mm');
  };

  const getEventLabel = (item: { event: any; isVisite: boolean }) => {
    const time = getEventTime(item);
    const label = item.isVisite 
      ? item.event.adresse?.substring(0, 12) 
      : item.event.title?.substring(0, 12);
    
    if (time) {
      return `${time} ${label || ''}`;
    }
    return label || '';
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 md:p-6 w-full max-w-full overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-primary/10 transition-all duration-200"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            onClick={() => setCurrentMonth(new Date())}
          >
            Aujourd'hui
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-primary/10 transition-all duration-200"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
          <div 
            key={day} 
            className={cn(
              "text-center text-sm font-medium py-2 rounded-lg",
              idx >= 5 ? "text-muted-foreground/70" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 w-full">
        {/* Padding for days before month starts */}
        {Array.from({ length: paddingDays }).map((_, index) => (
          <div key={`padding-${index}`} className="h-20 md:h-24 bg-muted/20 rounded-lg min-w-0" />
        ))}

        {/* Actual days */}
        {days.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              style={{ animationDelay: `${dayIndex * 10}ms` }}
              className={cn(
                'h-20 md:h-24 p-1.5 rounded-lg border cursor-pointer transition-all duration-200 min-w-0 group',
                'hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5',
                !isSameMonth(day, currentMonth) && 'opacity-40',
                isWeekend && 'bg-muted/30',
                isToday(day) && 'border-primary border-2 bg-primary/5',
                isSelected && 'bg-accent ring-2 ring-primary shadow-md',
                'animate-fade-in'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-1 transition-colors',
                isToday(day) && 'text-primary font-bold',
                isSelected && 'text-primary',
                isWeekend && !isToday(day) && !isSelected && 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => handleEventClick(e, item)}
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded truncate text-white cursor-pointer',
                      'transition-all duration-200 hover:opacity-90 hover:scale-[1.02]',
                      eventTypeColors[item.type] || 'bg-gray-500'
                    )}
                    title={item.isVisite ? item.event.adresse : item.event.title}
                  >
                    {getEventLabel(item)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium pl-1">
                    +{dayEvents.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 md:gap-4 mt-6 pt-4 border-t">
        {[
          { type: 'visite', label: 'Visite', ring: false },
          { type: 'visite_deleguee', label: 'Visite déléguée', ring: true },
          { type: 'signature', label: 'Signature', ring: false },
          { type: 'etat_lieux', label: 'État des lieux', ring: false },
          { type: 'rappel', label: 'Rappel', ring: false },
          { type: 'rendez_vous', label: 'RDV', ring: false },
          { type: 'tache', label: 'Tâche', ring: false },
          { type: 'reunion', label: 'Réunion', ring: false },
        ].map(({ type, label, ring }) => (
          <div key={type} className="flex items-center gap-1.5 group cursor-default">
            <div className={cn(
              'w-3 h-3 rounded transition-transform group-hover:scale-125',
              eventTypeColors[type],
              ring && 'ring-2 ring-green-300'
            )} />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
