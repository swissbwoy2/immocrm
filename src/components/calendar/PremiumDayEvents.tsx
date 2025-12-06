import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User, Users, CheckCircle, XCircle, Trash2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './CalendarView';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';

interface PremiumDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  agents?: { id: string; profiles: { prenom: string; nom: string } }[];
  clients?: { id: string; profiles: { prenom: string; nom: string } }[];
  onStatusChange?: (eventId: string, status: string) => void;
  onDelete?: (eventId: string) => void;
  onDeleteVisite?: (visiteId: string) => void;
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
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  rappel: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
  rendez_vous: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  tache: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400',
  reunion: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400',
  signature: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  etat_lieux: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-400',
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

export function PremiumDayEvents({ 
  date, 
  events, 
  visites, 
  agents = [], 
  clients = [], 
  onStatusChange, 
  onDelete, 
  onDeleteVisite, 
  onVisiteGroupClick 
}: PremiumDayEventsProps) {
  if (!date) {
    return (
      <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-6 h-full flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/10 pointer-events-none" />
        <div className="text-center relative z-10">
          <div className="inline-block p-4 rounded-2xl bg-muted/30 mb-3">
            <Calendar className="h-8 w-8 text-muted-foreground/50 animate-float" />
          </div>
          <p className="text-muted-foreground">
            Sélectionnez un jour pour voir les événements
          </p>
        </div>
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
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 h-full flex flex-col shadow-xl">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold capitalize">
              {format(date, 'EEEE d MMMM', { locale: fr })}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {allItems.length} événement{allItems.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 relative z-10">
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 rounded-2xl bg-muted/30 mb-3 animate-float">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">Aucun événement ce jour</p>
          </div>
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
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={cn(
                      'p-4 rounded-xl border backdrop-blur-sm animate-fade-in',
                      'transition-all duration-300 hover:shadow-lg hover:scale-[1.02]',
                      eventTypeColors.visite,
                      onVisiteGroupClick && 'cursor-pointer'
                    )}
                    onClick={() => onVisiteGroupClick?.(group)}
                    role={onVisiteGroupClick ? "button" : undefined}
                    tabIndex={onVisiteGroupClick ? 0 : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-medium">
                            {eventTypeLabels.visite}
                          </Badge>
                          {group.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {group.length} clients
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mt-2 break-words">
                          {firstVisite.adresse}
                        </h4>
                        <p className="text-sm flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(eventDate, 'HH:mm')}
                        </p>
                        
                        {/* Liste des clients */}
                        {(() => {
                          const uniqueClients = getUniqueVisitesByClient(group);
                          return (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Clients concernés :
                              </p>
                              <div className="pl-4 space-y-0.5">
                                {uniqueClients.map((visite: any) => (
                                  <div key={visite.client_id} className="text-xs flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                    {getClientName(visite.client_id) || 'Client inconnu'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {firstVisite.agent_id && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {getAgentName(firstVisite.agent_id)}
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      {onDeleteVisite && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette visite ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La visite sera supprimée
                                {group.length > 1 ? ' pour tous les clients concernés' : ''}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  group.forEach((visite) => onDeleteVisite(visite.id));
                                }}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={cn(
                    'p-4 rounded-xl border backdrop-blur-sm animate-fade-in',
                    'transition-all duration-300 hover:shadow-lg hover:scale-[1.02]',
                    eventTypeColors[item.eventType]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-medium">
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
                      <h4 className="font-medium mt-2 break-words">
                        {data.title}
                      </h4>
                      {!data.all_day && (
                        <p className="text-sm flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(eventDate, 'HH:mm')}
                        </p>
                      )}
                      {data.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
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

                    {/* Delete button */}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {data.id.startsWith('signature-') 
                                ? 'La date de signature sera supprimée de la candidature.'
                                : data.id.startsWith('etat-lieux-')
                                ? 'La date d\'état des lieux sera supprimée de la candidature.'
                                : 'Cette action est irréversible.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDelete(data.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Status actions */}
                  {onStatusChange && data.status !== 'effectue' && !data.id.startsWith('signature-') && !data.id.startsWith('etat-lieux-') && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-current/10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-colors"
                        onClick={() => onStatusChange(data.id, 'effectue')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                        Marquer effectué
                      </Button>
                      {data.status !== 'annule' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 transition-colors"
                          onClick={() => onStatusChange(data.id, 'annule')}
                        >
                          <XCircle className="h-3 w-3 mr-1.5" />
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
