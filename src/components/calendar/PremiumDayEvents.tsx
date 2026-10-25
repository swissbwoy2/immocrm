import { format, differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { useMemo } from 'react';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, User, Users, CheckCircle, XCircle, Trash2,
  Home, Maximize, Building
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors, priorityColors } from './types';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

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
  onPhoneApptClick?: (apptId: string) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  planifie: <Clock className="h-3 w-3" />,
  effectue: <CheckCircle className="h-3 w-3 text-emerald-600" />,
  annule: <XCircle className="h-3 w-3 text-destructive" />,
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
  onVisiteGroupClick,
  onPhoneApptClick,
}: PremiumDayEventsProps) {
  const allItems = useMemo(() => {
    const groups = new Map<string, any[]>();
    visites.forEach(visite => {
      const key = `${visite.adresse}-${visite.date_visite}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(visite);
    });
    const items: { type: 'event' | 'visite-group'; data: any; eventType: string }[] = [
      ...events.map(event => ({ type: 'event' as const, data: event, eventType: event.event_type })),
      ...Array.from(groups.values()).map(group => ({ type: 'visite-group' as const, data: group, eventType: 'visite' })),
    ];
    return items.sort((a, b) => new Date(a.type === 'event' ? a.data.event_date : a.data[0].date_visite).getTime()
      - new Date(b.type === 'event' ? b.data.event_date : b.data[0].date_visite).getTime());
  }, [events, visites]);
  if (!date) {
    return (
      <div className={cn(DASH_CARD, 'h-full overflow-hidden')}>
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="w-7 h-7 text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un jour pour voir les événements
            </p>
          </div>
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

  const getTimeRemaining = (eventDate: Date) => {
    const now = new Date();
    
    if (eventDate < now) {
      return { text: 'Passé', color: 'bg-muted text-muted-foreground' };
    }
    
    if (isToday(eventDate)) {
      const hours = differenceInHours(eventDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };
      if (hours <= 3) return { text: `Dans ${hours}h`, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' };
      return { text: `Dans ${hours}h`, color: 'bg-primary/10 text-primary' };
    }
    
    if (isTomorrow(eventDate)) {
      return { text: 'Demain', color: 'bg-primary/10 text-primary' };
    }
    
    const days = differenceInDays(eventDate, now);
    return { text: `Dans ${days}j`, color: 'bg-primary/10 text-primary' };
  };

  return (
    <div className={cn(DASH_CARD, 'h-full overflow-hidden flex flex-col')}>
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold capitalize text-foreground truncate">
                {format(date, 'EEEE d MMMM', { locale: fr })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {allItems.length} événement{allItems.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {allItems.length > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
              {allItems.length}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>
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
                const timeRemaining = getTimeRemaining(eventDate);

                return (
                  <div
                    key={`visite-group-${firstVisite.id}-${idx}`}
                    className={cn(
                      'group relative rounded-xl border border-border/70 bg-card overflow-hidden transition-colors',
                      onVisiteGroupClick && 'cursor-pointer hover:border-foreground/30'
                    )}
                    onClick={() => onVisiteGroupClick?.(group)}
                    role={onVisiteGroupClick ? "button" : undefined}
                    tabIndex={onVisiteGroupClick ? 0 : undefined}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Badge de type de visite selon le statut */}
                            {group.some((g: any) => g.est_deleguee || g.source === 'deleguee') ? (
                              <Badge variant="outline" className="rounded-full text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-400 border-transparent">
                                DÉLÉGUÉE
                              </Badge>
                            ) : firstVisite.statut === 'proposee' ? (
                              <Badge variant="outline" className="rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent">
                                En attente de réponse
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent">
                                Visite confirmée
                              </Badge>
                            )}
                            {group.length > 1 && (
                              <Badge variant="secondary" className="rounded-full text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {group.length} clients
                              </Badge>
                            )}
                            <Badge variant="outline" className={cn("rounded-full border-transparent text-xs font-semibold", timeRemaining.color)}>
                              {timeRemaining.text}
                            </Badge>
                          </div>
                          <h4 className="text-base font-semibold mt-2 text-foreground">
                            {firstVisite.adresse}
                          </h4>
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

                      {/* Date & Time Card */}
                      <div className="p-3 rounded-xl bg-muted/60">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Clock className="w-[18px] h-[18px]" />
                          </span>
                          <div>
                            <p className="font-semibold text-sm">
                              {format(eventDate, 'HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(eventDate, "EEEE d MMMM", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Property details */}
                      {firstVisite.offres && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded-xl border border-border/70 text-center">
                            <Home className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Pièces</p>
                            <p className="font-semibold text-sm text-foreground">{firstVisite.offres.pieces || '-'}</p>
                          </div>
                          <div className="p-2 rounded-xl border border-border/70 text-center">
                            <Maximize className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Surface</p>
                            <p className="font-semibold text-sm text-foreground">{firstVisite.offres.surface || '-'} m²</p>
                          </div>
                          <div className="p-2 rounded-xl border border-border/70 text-center">
                            <Building className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="font-semibold text-sm text-foreground">{firstVisite.offres.prix} CHF</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Client list */}
                      {(() => {
                        const uniqueClients = getUniqueVisitesByClient(group);
                        return (
                          <div className="pt-3 border-t border-border/70">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <Users className="h-3 w-3" />
                              Clients concernés
                            </p>
                            <div className="space-y-1.5">
                              {uniqueClients.map((visite: any) => (
                                <div key={visite.client_id} className="flex items-center gap-2 p-2 rounded-xl border border-border/70">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="h-3 w-3 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {getClientName(visite.client_id) || 'Client inconnu'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Live de visite (Phase B) — hôte : admin / agent / coursier */}
                      <div className="pt-3 border-t border-border/70" onClick={(e) => e.stopPropagation()}>
                        <VisitLiveButton visiteId={firstVisite.id} className="w-full rounded-full" />
                      </div>

                      {firstVisite.agent_id && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/70">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{getAgentName(firstVisite.agent_id)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Regular event rendering
              const data = item.data;
              const eventDate = new Date(data.event_date);
              const timeRemaining = getTimeRemaining(eventDate);
              const isPhoneRdv = typeof data.id === 'string' && data.id.startsWith('phone-rdv-');
              const phoneApptId = isPhoneRdv ? data.id.replace('phone-rdv-', '') : null;

              return (
                <div
                  key={`${item.type}-${data.id}-${idx}`}
                  className={cn(
                    'group relative rounded-xl border overflow-hidden transition-colors',
                    eventTypeColors[item.eventType],
                    isPhoneRdv && onPhoneApptClick && 'cursor-pointer hover:border-foreground/30'
                  )}
                  onClick={isPhoneRdv && onPhoneApptClick ? () => onPhoneApptClick(phoneApptId!) : undefined}
                  role={isPhoneRdv && onPhoneApptClick ? 'button' : undefined}
                  tabIndex={isPhoneRdv && onPhoneApptClick ? 0 : undefined}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="rounded-full text-xs font-medium bg-background/70">
                            {eventTypeLabels[item.eventType]}
                          </Badge>
                          {data.priority && (
                            <Badge className={cn('rounded-full text-xs', priorityColors[data.priority])}>
                              {data.priority}
                            </Badge>
                          )}
                          {data.status && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {statusIcons[data.status]}
                              {data.status}
                            </span>
                          )}
                          <Badge variant="outline" className={cn("rounded-full border-transparent text-xs font-semibold", timeRemaining.color)}>
                            {timeRemaining.text}
                          </Badge>
                        </div>
                        <h4 className="text-base font-semibold mt-2 text-foreground">
                          {data.title}
                        </h4>
                        {!data.all_day && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                            </span>
                            <span className="text-sm font-medium">{format(eventDate, 'HH:mm')}</span>
                          </div>
                        )}
                        {data.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {data.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          {data.agent_id && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70">
                              <User className="h-3 w-3" />
                              {getAgentName(data.agent_id)}
                            </span>
                          )}
                          {data.client_id && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70">
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
                    {onStatusChange && data.status !== 'effectue' && !data.id.startsWith('signature-') && !data.id.startsWith('etat-lieux-') && !isPhoneRdv && (
                      <div className="flex gap-2 pt-3 border-t border-border/70">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 flex-1 rounded-full hover:bg-emerald-500/10 hover:text-emerald-700"
                          onClick={() => onStatusChange(data.id, 'effectue')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Effectué
                        </Button>
                        {data.status !== 'annule' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 flex-1 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onStatusChange(data.id, 'annule')}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
