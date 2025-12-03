import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, User, MapPin, CheckCircle, XCircle, Trash2,
  MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Minus, Eye, Pencil
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './CalendarView';

interface AgentDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  clients: { id: string; user_id: string; profiles: { prenom: string; nom: string } }[];
  onStatusChange?: (eventId: string, status: string) => void;
  onDelete?: (eventId: string) => void;
  onEdit?: (event: CalendarEvent) => void;
  onMarquerEffectuee: (visite: any) => void;
  onOpenDetail: (visite: any) => void;
  onOpenEventDetail?: (event: CalendarEvent) => void;
}

const eventTypeLabels: Record<string, string> = {
  visite: 'Visite',
  rappel: 'Rappel',
  rendez_vous: 'Rendez-vous',
  tache: 'Tâche',
  reunion: 'Réunion',
  autre: 'Autre',
};

const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  rappel: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
  rendez_vous: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  tache: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400',
  reunion: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400',
  autre: 'bg-gray-500/10 text-gray-700 border-gray-500/30 dark:text-gray-400',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  normale: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  haute: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  planifie: <Clock className="h-3 w-3" />,
  effectue: <CheckCircle className="h-3 w-3 text-green-500" />,
  annule: <XCircle className="h-3 w-3 text-red-500" />,
};

export function AgentDayEvents({ 
  date, events, visites, clients, 
  onStatusChange, onDelete, onEdit, onMarquerEffectuee, onOpenDetail, onOpenEventDetail 
}: AgentDayEventsProps) {
  if (!date) {
    return (
      <div className="bg-card rounded-lg border p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Sélectionnez un jour pour voir les événements
        </p>
      </div>
    );
  }

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : null;
  };

  const getVisiteUrgency = (dateVisite: string) => {
    const now = new Date();
    const visiteDate = new Date(dateVisite);
    const timeDiff = visiteDate.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (minutesDiff <= 0) {
      return null; // Passée
    } else if (minutesDiff <= 30) {
      return { level: 'critical', label: '30 min!', color: 'destructive' as const };
    } else if (minutesDiff <= 60) {
      return { level: 'critical', label: '1h', color: 'destructive' as const };
    } else if (hoursDiff <= 3) {
      return { level: 'critical', label: `${hoursDiff}h`, color: 'destructive' as const };
    } else if (daysDiff === 0) {
      return { level: 'high', label: "Aujourd'hui", color: 'default' as const };
    } else if (daysDiff === 1) {
      return { level: 'high', label: 'Demain', color: 'secondary' as const };
    }
    return { level: 'normal', label: `${daysDiff}j`, color: 'outline' as const };
  };

  // Combine events and visites
  const allItems: { type: 'event' | 'visite'; data: any; eventType: string }[] = [];

  events.forEach((event) => {
    allItems.push({ type: 'event', data: event, eventType: event.event_type });
  });

  visites.forEach((visite) => {
    allItems.push({ type: 'visite', data: visite, eventType: 'visite' });
  });

  // Sort by time
  allItems.sort((a, b) => {
    const dateA = new Date(a.type === 'event' ? a.data.event_date : a.data.date_visite);
    const dateB = new Date(b.type === 'event' ? b.data.event_date : b.data.date_visite);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {allItems.length} événement{allItems.length > 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun événement ce jour
            </p>
          ) : (
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                const isEvent = item.type === 'event';
                const data = item.data;
                const eventDate = new Date(isEvent ? data.event_date : data.date_visite);

                if (!isEvent) {
                  // Render visite
                  const urgency = getVisiteUrgency(data.date_visite);
                  const isUrgent = urgency?.level === 'critical';
                  const isPast = data.statut === 'effectuee' || new Date(data.date_visite) < new Date();

                  return (
                    <div
                      key={`visite-${data.id}-${idx}`}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all select-none',
                        'active:scale-[0.99]',
                        isUrgent ? 'border-destructive/50 bg-destructive/5' : 
                        data.est_deleguee ? 'border-green-500/50 bg-green-500/5 ring-2 ring-green-400' : 
                        'bg-blue-500/10 border-blue-500/30',
                        isPast && 'opacity-60'
                      )}
                      onClick={() => {
                        console.log('Visite clicked:', data.id);
                        onOpenDetail(data);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenDetail(data);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs pointer-events-none">Visite</Badge>
                            {data.est_deleguee && (
                              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 pointer-events-none">Déléguée</Badge>
                            )}
                            {urgency && !isPast && (
                              <Badge variant={urgency.color} className={cn("text-xs pointer-events-none", isUrgent && "animate-pulse")}>
                                {isUrgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {urgency.label}
                              </Badge>
                            )}
                            {isPast && (
                              <Badge variant="secondary" className="text-xs pointer-events-none">
                                {data.statut === 'effectuee' ? 'Effectuée' : 'Passée'}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium mt-1 truncate">{data.adresse}</h4>
                          <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(eventDate, 'HH:mm')}
                          </p>
                          {data.client_profile && (
                            <p className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              {data.est_deleguee && 'Pour '}
                              {data.client_profile.prenom} {data.client_profile.nom}
                            </p>
                          )}
                          {data.offres && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {data.offres.pieces} pièces • {data.offres.surface}m² • {data.offres.prix} CHF
                            </p>
                          )}
                          {data.recommandation_agent && (
                            <div className="mt-2">
                              {data.recommandation_agent === 'recommande' && (
                                <Badge className="text-xs bg-green-100 text-green-700 pointer-events-none">
                                  <ThumbsUp className="h-3 w-3 mr-1" /> Recommandé
                                </Badge>
                              )}
                              {data.recommandation_agent === 'neutre' && (
                                <Badge variant="secondary" className="text-xs pointer-events-none">
                                  <Minus className="h-3 w-3 mr-1" /> Neutre
                                </Badge>
                              )}
                              {data.recommandation_agent === 'deconseille' && (
                                <Badge variant="destructive" className="text-xs pointer-events-none">
                                  <ThumbsDown className="h-3 w-3 mr-1" /> Déconseillé
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 relative z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('Eye button clicked:', data.id);
                            onOpenDetail(data);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      {data.statut === 'planifiee' && !isPast && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                          <Button
                            size="sm"
                            variant={isUrgent ? "destructive" : "default"}
                            className="w-full text-xs h-8 relative z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Marquer effectuee clicked:', data.id);
                              onMarquerEffectuee(data);
                            }}
                          >
                            {data.est_deleguee ? (
                              <>
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Donner mon feedback
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Marquer effectuée
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Render calendar event
                return (
                  <div
                    key={`event-${data.id}-${idx}`}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all select-none',
                      'active:scale-[0.99]',
                      eventTypeColors[item.eventType]
                    )}
                    onClick={() => {
                      console.log('Event clicked:', data.id);
                      onOpenEventDetail?.(data);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenEventDetail?.(data);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs pointer-events-none">
                            {eventTypeLabels[item.eventType]}
                          </Badge>
                          {data.priority && (
                            <Badge className={cn('text-xs pointer-events-none', priorityColors[data.priority])}>
                              {data.priority}
                            </Badge>
                          )}
                          {data.status && (
                            <span className="flex items-center gap-1 text-xs pointer-events-none">
                              {statusIcons[data.status]}
                              {data.status}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium mt-1 truncate">{data.title}</h4>
                        {!data.all_day && (
                          <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(eventDate, 'HH:mm')}
                          </p>
                        )}
                        {data.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {data.description}
                          </p>
                        )}
                        {data.client_id && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            {getClientName(data.client_id)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 relative z-10">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Edit clicked:', data.id);
                              onEdit(data);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Delete clicked:', data.id);
                              onDelete(data.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {onStatusChange && data.status !== 'effectue' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-current/10 relative z-10">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('Status effectue clicked:', data.id);
                            onStatusChange(data.id, 'effectue');
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Effectué
                        </Button>
                        {data.status !== 'annule' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Status annule clicked:', data.id);
                              onStatusChange(data.id, 'annule');
                            }}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
