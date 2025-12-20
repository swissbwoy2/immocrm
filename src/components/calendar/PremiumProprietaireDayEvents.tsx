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
    bgColor: 'bg-blue-500/10 border-blue-500/30', 
    label: 'Bail' 
  },
  hypotheque: { 
    icon: Banknote, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-500/10 border-purple-500/30', 
    label: 'Hypothèque' 
  },
  assurance: { 
    icon: Shield, 
    color: 'text-green-600', 
    bgColor: 'bg-green-500/10 border-green-500/30', 
    label: 'Assurance' 
  },
  ticket: { 
    icon: Wrench, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-500/10 border-orange-500/30', 
    label: 'Ticket technique' 
  },
  event: { 
    icon: Calendar, 
    color: 'text-primary', 
    bgColor: 'bg-primary/10 border-primary/30', 
    label: 'Événement' 
  },
};

const priorityColors: Record<string, string> = {
  haute: 'bg-red-500/20 text-red-700 border-red-500/30',
  normale: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  basse: 'bg-green-500/20 text-green-700 border-green-500/30',
};

const EventCard = memo(({ event, onClick }: { event: ProprietaireEvent; onClick?: () => void }) => {
  const config = eventTypeConfig[event.type] || eventTypeConfig.event;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border transition-all duration-300 cursor-pointer group',
        'hover:shadow-lg hover:scale-[1.02] hover:border-primary/40',
        'backdrop-blur-sm animate-fade-in',
        config.bgColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110',
          config.bgColor
        )}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Badge variant="outline" className={cn('text-[10px] px-2', config.bgColor, config.color)}>
              {config.label}
            </Badge>
            {event.priority && (
              <Badge variant="outline" className={cn('text-[10px] px-2', priorityColors[event.priority])}>
                {event.priority === 'haute' ? 'Urgent' : event.priority === 'normale' ? 'Normal' : 'Bas'}
              </Badge>
            )}
          </div>
          
          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {event.title}
          </h4>
          
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
        <div className="p-4 rounded-2xl bg-muted/30 mb-4">
          <Calendar className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground/70">Sélectionnez une date</h3>
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
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">
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
            <div className="p-3 rounded-xl bg-muted/30 mb-3">
              <Calendar className="w-8 h-8 text-muted-foreground/40" />
            </div>
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
        <div className="p-3 border-t border-border/50 bg-muted/20">
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
