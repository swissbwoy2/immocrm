import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User, Users, MapPin, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './CalendarView';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';

interface DayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  agents: { id: string; profiles: { prenom: string; nom: string } }[];
  clients: { id: string; profiles: { prenom: string; nom: string } }[];
  onStatusChange?: (eventId: string, status: string) => void;
  onDelete?: (eventId: string) => void;
  onVisiteGroupClick?: (visites: any[]) => void;
}

const eventTypeLabels: Record<string, string> = {
  visite: 'Visite',
  rappel: 'Rappel',
  rendez_vous: 'Rendez-vous',
  tache: 'Tâche',
  reunion: 'Réunion',
  signature: 'Signature bail',
  etat_lieux: 'État des lieux',
  autre: 'Autre',
};

const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  rappel: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  rendez_vous: 'bg-green-500/10 text-green-700 border-green-500/30',
  tache: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  reunion: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  signature: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  etat_lieux: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  autre: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-gray-100 text-gray-600',
  normale: 'bg-blue-100 text-blue-600',
  haute: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
};

const statusIcons: Record<string, React.ReactNode> = {
  planifie: <Clock className="h-3 w-3" />,
  effectue: <CheckCircle className="h-3 w-3 text-green-500" />,
  annule: <XCircle className="h-3 w-3 text-red-500" />,
};

export function DayEvents({ date, events, visites, agents, clients, onStatusChange, onDelete, onVisiteGroupClick }: DayEventsProps) {
  if (!date) {
    return (
      <div className="bg-card rounded-lg border p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Sélectionnez un jour pour voir les événements
        </p>
      </div>
    );
  }

  const getAgentName = (agentId?: string) => {
    if (!agentId) return null;
    const agent = agents.find((a) => a.id === agentId);
    return agent?.profiles ? `${agent.profiles.prenom} ${agent.profiles.nom}` : null;
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : null;
  };

  // Group visites by address + time
  const groupVisitesByAddressAndTime = (visitesArray: any[]) => {
    const groups = new Map<string, any[]>();
    visitesArray.forEach(visite => {
      const key = `${visite.adresse}-${visite.date_visite}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(visite);
    });
    return Array.from(groups.values());
  };

  // Combine events and visites for the selected day
  const allItems: { type: 'event' | 'visite-group'; data: any; eventType: string }[] = [];

  events.forEach((event) => {
    allItems.push({ type: 'event', data: event, eventType: event.event_type });
  });

  // Add grouped visites
  const groupedVisites = groupVisitesByAddressAndTime(visites);
  groupedVisites.forEach((group) => {
    allItems.push({ type: 'visite-group', data: group, eventType: 'visite' });
  });

  // Sort by time
  allItems.sort((a, b) => {
    const dateA = new Date(a.type === 'event' ? a.data.event_date : a.data[0].date_visite);
    const dateB = new Date(b.type === 'event' ? b.data.event_date : b.data[0].date_visite);
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

      <ScrollArea className="flex-1 p-4">
        {allItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun événement ce jour
          </p>
        ) : (
          <div className="space-y-3">
            {allItems.map((item, idx) => {
              const isEvent = item.type === 'event';
              const isVisiteGroup = item.type === 'visite-group';

              if (isVisiteGroup) {
                const group = item.data as any[];
                const firstVisite = group[0];
                const eventDate = new Date(firstVisite.date_visite);

                return (
                  <div
                    key={`visite-group-${firstVisite.id}-${idx}`}
                    className={cn(
                      'p-3 rounded-lg border',
                      eventTypeColors.visite,
                      onVisiteGroupClick && 'cursor-pointer hover:shadow-md transition-all'
                    )}
                    onClick={() => onVisiteGroupClick?.(group)}
                    role={onVisiteGroupClick ? "button" : undefined}
                    tabIndex={onVisiteGroupClick ? 0 : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {eventTypeLabels.visite}
                          </Badge>
                          {group.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.length} clients
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mt-1 break-words">
                          {firstVisite.adresse}
                        </h4>
                        <p className="text-sm flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(eventDate, 'HH:mm')}
                        </p>
                        
                        {/* Liste des clients (dédupliqués) */}
                        {(() => {
                          const uniqueClients = getUniqueVisitesByClient(group);
                          return (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Clients concernés :
                              </p>
                              <div className="pl-4 space-y-0.5">
                                {uniqueClients.map((visite: any) => (
                                  <div key={visite.client_id} className="text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                    {getClientName(visite.client_id) || 'Client inconnu'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {firstVisite.agent_id && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {getAgentName(firstVisite.agent_id)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Regular event rendering
              const data = item.data;
              const eventDate = new Date(data.event_date);

              return (
                <div
                  key={`${item.type}-${data.id}-${idx}`}
                  className={cn(
                    'p-3 rounded-lg border',
                    eventTypeColors[item.eventType]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {eventTypeLabels[item.eventType]}
                        </Badge>
                        {data.priority && (
                          <Badge className={cn('text-xs', priorityColors[data.priority])}>
                            {data.priority}
                          </Badge>
                        )}
                        {data.status && (
                          <span className="flex items-center gap-1 text-xs">
                            {statusIcons[data.status]}
                            {data.status}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium mt-1 break-words">
                        {data.title}
                      </h4>
                      {!data.all_day && (
                        <p className="text-sm flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(eventDate, 'HH:mm')}
                        </p>
                      )}
                      {data.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {data.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {data.agent_id && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getAgentName(data.agent_id)}
                          </span>
                        )}
                        {data.client_id && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getClientName(data.client_id)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Only show delete for real calendar events */}
                    {onDelete && !data.id.startsWith('signature-') && !data.id.startsWith('etat-lieux-') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(data.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Only show status actions for real calendar events */}
                  {onStatusChange && data.status !== 'effectue' && !data.id.startsWith('signature-') && !data.id.startsWith('etat-lieux-') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => onStatusChange(data.id, 'effectue')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Marquer effectué
                      </Button>
                      {data.status !== 'annule' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => onStatusChange(data.id, 'annule')}
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
      </ScrollArea>
    </div>
  );
}
