import { useState, useMemo, memo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeCalendarColors } from './types';
import { toSwissTime, formatSwissDate, formatSwissTime, getSwissDateString } from '@/lib/dateUtils';

interface PremiumCalendarViewProps {
  events: CalendarEvent[];
  visites: any[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: any, type: 'event' | 'visite') => void;
}

// Memoized day component for performance
const PremiumCalendarDay = memo(({ 
  day, 
  dayEvents, 
  isSelected, 
  isCurrentMonth, 
  onDateSelect, 
  onEventClick,
  animationDelay
}: {
  day: Date;
  dayEvents: { type: string; event: any; isVisite: boolean; isDelegated?: boolean }[];
  isSelected: boolean;
  isCurrentMonth: boolean;
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: any, type: 'event' | 'visite') => void;
  animationDelay: number;
}) => {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const isTodayDate = isToday(day);

  const handleEventClick = (e: React.MouseEvent, item: { event: any; isVisite: boolean }) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(item.event, item.isVisite ? 'visite' : 'event');
    }
  };

  const getEventTime = (item: { event: any; isVisite: boolean }) => {
    const dateStr = item.isVisite ? item.event.date_visite : item.event.event_date;
    if (!dateStr) return '';
    if (!item.isVisite && item.event.all_day) return '';
    return formatSwissTime(dateStr);
  };

  const getEventLabel = (item: { event: any; isVisite: boolean }) => {
    const time = getEventTime(item);
    const label = item.isVisite 
      ? item.event.adresse?.substring(0, 12) 
      : item.event.title?.substring(0, 12);
    if (time) return `${time} ${label || ''}`;
    return label || '';
  };

  return (
    <div
      onClick={() => onDateSelect(day)}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={cn(
        'h-20 md:h-24 p-1.5 rounded-xl border cursor-pointer min-w-0 group animate-fade-in',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40',
        'backdrop-blur-sm',
        !isCurrentMonth && 'opacity-40',
        isWeekend && 'bg-muted/20',
        isTodayDate && 'border-primary border-2 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/20',
        isSelected && 'bg-gradient-to-br from-accent to-accent/80 ring-2 ring-primary shadow-lg shadow-primary/20'
      )}
    >
      <div className={cn(
        'text-sm font-semibold mb-1 flex items-center gap-1',
        isTodayDate && 'text-primary',
        isSelected && 'text-primary',
        isWeekend && !isTodayDate && !isSelected && 'text-muted-foreground'
      )}>
        {formatSwissDate(day, 'd')}
        {isTodayDate && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <div className="space-y-0.5 overflow-hidden">
        {dayEvents.slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            onClick={(e) => handleEventClick(e, item)}
            className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-md truncate text-white cursor-pointer',
              'transition-all duration-200 hover:opacity-90 hover:translate-x-0.5',
              eventTypeCalendarColors[item.type] || 'bg-gray-500'
            )}
            title={item.isVisite ? item.event.adresse : item.event.title}
          >
            {getEventLabel(item)}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[10px] text-muted-foreground font-medium pl-1 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            +{dayEvents.length - 3}
          </div>
        )}
      </div>
    </div>
  );
});

PremiumCalendarDay.displayName = 'PremiumCalendarDay';

export function PremiumCalendarView({ events, visites, selectedDate, onDateSelect, onEventClick }: PremiumCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Memoize calendar calculations
  const { days, paddingDays } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const paddingDays = startDay === 0 ? 6 : startDay - 1;
    return { days, paddingDays };
  }, [currentMonth]);

  // Memoize events map for O(1) lookup
  const eventsMap = useMemo(() => {
    const map = new Map<string, { type: string; event: any; isVisite: boolean; isDelegated?: boolean; source?: string }[]>();
    
    // Add calendar events
    events.forEach((event) => {
      const dateKey = getSwissDateString(event.event_date);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push({ type: event.event_type, event, isVisite: false });
    });

    // Group visites by address + time
    visites.forEach((visite) => {
      const dateKey = getSwissDateString(visite.date_visite);
      if (!map.has(dateKey)) map.set(dateKey, []);
      
      const existing = map.get(dateKey)!;
      const key = `${visite.adresse}-${visite.date_visite}`;
      const existingVisite = existing.find(e => e.isVisite && `${e.event.adresse}-${e.event.date_visite}` === key);
      
      // Déterminer le type de visite selon la source
      let visiteType = 'visite';
      if (visite.est_deleguee || visite.source === 'deleguee') {
        visiteType = 'visite_deleguee';
      } else if (visite.source === 'proposee_agent') {
        visiteType = 'visite_proposee';
      }
      // planifiee_client garde le type 'visite' (confirmée)
      
      if (!existingVisite) {
        existing.push({ 
          type: visiteType, 
          event: { ...visite, groupedClients: [visite] },
          isVisite: true,
          isDelegated: visite.est_deleguee,
          source: visite.source
        });
      } else {
        existingVisite.event.groupedClients.push(visite);
      }
    });

    return map;
  }, [events, visites]);

  const getEventsForDay = (date: Date) => {
    const dateKey = getSwissDateString(date);
    return eventsMap.get(dateKey) || [];
  };

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl p-4 md:p-6 w-full max-w-full">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
              <Calendar className="h-5 w-5 text-primary animate-pulse-soft" />
            </div>
            <div>
              <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {formatSwissDate(currentMonth, 'MMMM yyyy')}
              </h2>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all duration-200 hover:scale-105"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl font-medium transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-md"
              onClick={() => setCurrentMonth(new Date())}
            >
              Aujourd'hui
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all duration-200 hover:scale-105"
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
                "text-center text-sm font-semibold py-2 rounded-lg",
                idx >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
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
            <div key={`padding-${index}`} className="h-20 md:h-24 bg-muted/10 rounded-xl min-w-0" />
          ))}

          {/* Actual days */}
          {days.map((day, index) => (
            <PremiumCalendarDay
              key={day.toISOString()}
              day={day}
              dayEvents={getEventsForDay(day)}
              isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              onDateSelect={onDateSelect}
              onEventClick={onEventClick}
              animationDelay={index * 10}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 md:gap-4 mt-6 pt-4 border-t border-border/50">
          {[
            { type: 'visite_proposee', label: 'Créneau proposé', ring: false },
            { type: 'visite', label: 'Visite confirmée', ring: false },
            { type: 'visite_deleguee', label: 'Déléguée (urgent)', ring: true },
            { type: 'signature', label: 'Signature', ring: false },
            { type: 'etat_lieux', label: 'État des lieux', ring: false },
            { type: 'rappel', label: 'Rappel', ring: false },
            { type: 'rendez_vous', label: 'RDV', ring: false },
            { type: 'tache', label: 'Tâche', ring: false },
            { type: 'reunion', label: 'Réunion', ring: false },
          ].map(({ type, label, ring }) => (
            <div key={type} className="flex items-center gap-1.5 group cursor-default transition-all duration-200 hover:scale-105">
              <div className={cn(
                'w-3 h-3 rounded-md shadow-sm',
                eventTypeCalendarColors[type],
                ring && 'ring-2 ring-orange-300'
              )} />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
