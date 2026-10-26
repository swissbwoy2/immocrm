import { useState, useMemo, memo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeCalendarColors, eventTypeChipColors, DEFAULT_EVENT_CHIP } from './types';
import { toSwissTime, formatSwissDate, formatSwissTime, getSwissDateString } from '@/lib/dateUtils';
import { useIsIOS } from '@/hooks/useIsIOS';

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
  animationDelay,
  isIOS
}: {
  day: Date;
  dayEvents: { type: string; event: any; isVisite: boolean; isDelegated?: boolean }[];
  isSelected: boolean;
  isCurrentMonth: boolean;
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: any, type: 'event' | 'visite') => void;
  animationDelay: number;
  isIOS: boolean;
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
      className={cn(
        'group h-20 min-w-0 cursor-pointer rounded-xl border border-border/70 bg-card p-1 sm:p-1.5 md:h-24',
        'transition-colors duration-150 hover:border-foreground/30',
        isIOS && 'ios-gpu-accelerated',
        !isCurrentMonth && 'opacity-40',
        isWeekend && 'bg-muted/30',
        isTodayDate && 'border-primary/40',
        isSelected && 'border-foreground bg-muted/50'
      )}
    >
      <div className={cn(
        'mb-1 flex items-center gap-1 text-xs font-medium text-foreground',
        isWeekend && !isTodayDate && !isSelected && 'text-muted-foreground'
      )}>
        <span className={cn(
          'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1',
          isTodayDate && 'bg-primary font-semibold text-primary-foreground'
        )}>
          {formatSwissDate(day, 'd')}
        </span>
      </div>
      <div className="space-y-0.5 overflow-hidden">
        {dayEvents.slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            onClick={(e) => handleEventClick(e, item)}
            className={cn(
              'cursor-pointer truncate rounded-md border px-1 py-0.5 text-[10px] leading-tight sm:px-1.5',
              'transition-opacity hover:opacity-80',
              eventTypeChipColors[item.type] || DEFAULT_EVENT_CHIP
            )}
            title={item.isVisite ? item.event.adresse : item.event.title}
          >
            {getEventLabel(item)}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="flex items-center gap-0.5 pl-1 text-[10px] font-medium text-muted-foreground">
            +{dayEvents.length - 3}
          </div>
        )}
      </div>
    </div>
  );
});

PremiumCalendarDay.displayName = 'PremiumCalendarDay';

export function PremiumCalendarView({ events, visites, selectedDate, onDateSelect, onEventClick }: PremiumCalendarViewProps) {
  const isIOS = useIsIOS();
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
      
      // Déterminer le type de visite selon le statut
      let visiteType = 'visite';
      if (visite.est_deleguee || visite.source === 'deleguee') {
        visiteType = 'visite_deleguee';
      } else if (visite.statut === 'proposee') {
        visiteType = 'visite_proposee';
      }
      // planifiee garde le type 'visite' (confirmée)
      
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
    <div className={cn(
      "relative w-full max-w-full overflow-hidden rounded-2xl border border-border/70 bg-card p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)] sm:p-4 md:p-5",
      isIOS && "ios-gpu-accelerated"
    )}>
      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold capitalize text-foreground sm:text-lg">
                {formatSwissDate(currentMonth, 'MMMM yyyy')}
              </h2>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-4"
              onClick={() => setCurrentMonth(new Date())}
            >
              Aujourd'hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week days header */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
            <div 
              key={day} 
              className={cn(
                "py-2 text-center text-[11px] font-medium sm:text-xs",
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
            <div key={`padding-${index}`} className="h-20 min-w-0 rounded-xl md:h-24" />
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
              isIOS={isIOS}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-border/70 pt-3">
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
            <div key={type} className="flex cursor-default items-center gap-1.5">
              <span className={cn(
                'h-2.5 w-2.5 rounded-full',
                eventTypeCalendarColors[type],
                ring && 'ring-2 ring-orange-500/30'
              )} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
