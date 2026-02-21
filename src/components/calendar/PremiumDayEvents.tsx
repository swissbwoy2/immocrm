import { format, differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, User, Users, CheckCircle, XCircle, Trash2, Sparkles,
  Home, Maximize, Building
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors, priorityColors } from './types';
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
      <div className="relative h-full rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-primary/60 animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl animate-pulse" />
            </div>
            <p className="text-muted-foreground font-medium">
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
      return { text: 'Passé', color: 'text-muted-foreground' };
    }
    
    if (isToday(eventDate)) {
      const hours = differenceInHours(eventDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'text-green-500' };
      if (hours <= 3) return { text: `Dans ${hours}h`, color: 'text-orange-500' };
      return { text: `Dans ${hours}h`, color: 'text-blue-500' };
    }
    
    if (isTomorrow(eventDate)) {
      return { text: 'Demain', color: 'text-blue-500' };
    }
    
    const days = differenceInDays(eventDate, now);
    return { text: `Dans ${days}j`, color: 'text-primary' };
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
    <div className="relative h-full rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 overflow-hidden flex flex-col shadow-xl">
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/15 animate-float"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${4 + i * 0.3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Premium Header */}
      <div className="relative z-10 p-5 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg capitalize">
                {format(date, 'EEEE d MMMM', { locale: fr })}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {allItems.length} événement{allItems.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {allItems.length > 0 && (
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              {allItems.length}
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 relative z-10">
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative inline-block mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-muted-foreground/50" />
              </div>
            </div>
            <p className="text-muted-foreground font-medium">Aucun événement ce jour</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={cn(
                      'group relative rounded-xl bg-gradient-to-br from-card to-card/80 border overflow-hidden animate-fade-in',
                      'transition-all duration-300 hover:shadow-lg hover:scale-[1.01]',
                      eventTypeColors.visite,
                      onVisiteGroupClick && 'cursor-pointer hover:border-primary/50'
                    )}
                    onClick={() => onVisiteGroupClick?.(group)}
                    role={onVisiteGroupClick ? "button" : undefined}
                    tabIndex={onVisiteGroupClick ? 0 : undefined}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <div className="relative p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Badge de type de visite selon le statut */}
                            {firstVisite.est_deleguee || firstVisite.source === 'deleguee' ? (
                              <Badge variant="outline" className="text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 animate-pulse">
                                🔥 DÉLÉGUÉE
                              </Badge>
                            ) : firstVisite.statut === 'proposee' ? (
                              <Badge variant="outline" className="text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                ⏳ En attente de réponse
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                ✅ Visite confirmée
                              </Badge>
                            )}
                            {group.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {group.length} clients
                              </Badge>
                            )}
                            <Badge variant="outline" className={cn("text-xs", timeRemaining.color)}>
                              {timeRemaining.text}
                            </Badge>
                          </div>
                          <h4 className="font-bold mt-2 text-base group-hover:text-primary transition-colors">
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
                      <div className="relative p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
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
                          <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center hover:border-primary/30 transition-colors">
                            <Home className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Pièces</p>
                            <p className="font-bold text-sm">{firstVisite.offres.pieces || '-'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center hover:border-primary/30 transition-colors">
                            <Maximize className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Surface</p>
                            <p className="font-bold text-sm">{firstVisite.offres.surface || '-'} m²</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center hover:border-primary/30 transition-colors">
                            <Building className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="font-bold text-sm">{firstVisite.offres.prix} CHF</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Client list */}
                      {(() => {
                        const uniqueClients = getUniqueVisitesByClient(group);
                        return (
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <Users className="h-3 w-3" />
                              Clients concernés
                            </p>
                            <div className="space-y-1.5">
                              {uniqueClients.map((visite: any) => (
                                <div key={visite.client_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
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

                      {firstVisite.agent_id && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
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

              return (
                <div
                  key={`${item.type}-${data.id}-${idx}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={cn(
                    'group relative rounded-xl bg-gradient-to-br from-card to-card/80 border overflow-hidden animate-fade-in',
                    'transition-all duration-300 hover:shadow-lg hover:scale-[1.01]',
                    eventTypeColors[item.eventType]
                  )}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div className="relative p-4 space-y-3">
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
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {statusIcons[data.status]}
                              {data.status}
                            </span>
                          )}
                          <Badge variant="outline" className={cn("text-xs", timeRemaining.color)}>
                            {timeRemaining.text}
                          </Badge>
                        </div>
                        <h4 className="font-bold mt-2 text-base group-hover:text-primary transition-colors">
                          {data.title}
                        </h4>
                        {!data.all_day && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="p-1.5 rounded-md bg-primary/10">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                            </div>
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
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                              <User className="h-3 w-3" />
                              {getAgentName(data.agent_id)}
                            </span>
                          )}
                          {data.client_id && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
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
                      <div className="flex gap-2 pt-3 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 flex-1 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-all"
                          onClick={() => onStatusChange(data.id, 'effectue')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Effectué
                        </Button>
                        {data.status !== 'annule' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 flex-1 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 transition-all"
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
