import { memo } from 'react';
import { 
  FileText, Key, Shield, Banknote, Wrench, Calendar, Clock, 
  MapPin, Building2, User, AlertCircle, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatSwissDate, formatSwissTime, formatSwissRelativeDate } from '@/lib/dateUtils';

interface ProprietaireEvent {
  id: string;
  type: 'bail' | 'hypotheque' | 'assurance' | 'ticket' | 'event';
  title: string;
  description?: string;
  date: string;
  status?: string;
  priority?: string;
  immeuble?: string;
  lot?: string;
}

interface PremiumProprietaireDayEventsProps {
  date: Date | null;
  events: ProprietaireEvent[];
  onEventClick?: (event: ProprietaireEvent) => void;
}

const eventTypeConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  bail: { 
    icon: FileText, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500/10', 
    label: 'Bail' 
  },
  hypotheque: { 
    icon: Banknote, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-500/10', 
    label: 'Hypothèque' 
  },
  assurance: { 
    icon: Shield, 
    color: 'text-green-600', 
    bgColor: 'bg-green-500/10', 
    label: 'Assurance' 
  },
  ticket: { 
    icon: Wrench, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-500/10', 
    label: 'Ticket technique' 
  },
  event: { 
    icon: Calendar, 
    color: 'text-primary', 
    bgColor: 'bg-primary/10', 
    label: 'Événement' 
  },
};

const priorityColors: Record<string, string> = {
  haute: 'bg-destructive/10 text-destructive border-transparent',
  normale: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent',
  basse: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent',
};

const EventCard = memo(({ event, onClick }: { event: ProprietaireEvent; onClick?: () => void }) => {
  const config = eventTypeConfig[event.type] || eventTypeConfig.event;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-border/70 bg-card transition-colors cursor-pointer group hover:border-foreground/30"
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          config.bgColor
        )}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Badge variant="outline" className={cn('rounded-full border-transparent text-xs font-semibold px-2', config.bgColor, config.color)}>
              {config.label}
            </Badge>
            {event.priority && (
              <Badge variant="outline" className={cn('rounded-full text-xs font-semibold px-2', priorityColors[event.priority])}>
                {event.priority === 'haute' ? 'Urgent' : event.priority === 'normale' ? 'Normal' : 'Bas'}
              </Badge>
            )}
          </div>
          
          <h4 className="text-base font-semibold text-foreground truncate">
            {event.title}
          </h4>
          
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatSwissTime(event.date) || 'Journée'}</span>
            </div>
            
            {event.immeuble && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{event.immeuble}</span>
              </div>
            )}
            
            {event.lot && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Lot {event.lot}</span>
              </div>
            )}
          </div>
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';

export function PremiumProprietaireDayEvents({ date, events, onEventClick }: PremiumProprietaireDayEventsProps) {
  if (!date) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="w-7 h-7 text-primary" />
        </span>
        <h3 className="text-base font-semibold text-foreground">Sélectionnez une date</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cliquez sur un jour pour voir les événements
        </p>
      </div>
    );
  }

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border/70">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              {formatSwissRelativeDate(date)}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {formatSwissDate(date, 'EEEE d MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Events list */}
      <ScrollArea className="flex-1 p-4">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              Aucun événement ce jour
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick?.(event)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary footer */}
      {sortedEvents.length > 0 && (
        <div className="p-3 border-t border-border/70">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              {Object.entries(
                sortedEvents.reduce((acc, e) => {
                  acc[e.type] = (acc[e.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => {
                const config = eventTypeConfig[type];
                const Icon = config?.icon || Calendar;
                return (
                  <div key={type} className="flex items-center gap-1">
                    <Icon className={cn('w-3 h-3', config?.color || 'text-muted-foreground')} />
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
