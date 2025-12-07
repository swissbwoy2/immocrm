import { format, differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, User, MapPin, CheckCircle, XCircle, Trash2,
  MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Minus, Eye, Pencil,
  Sparkles, Home, Maximize, Building, Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors, priorityColors } from './types';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PremiumAgentDayEventsProps {
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
  onDeleteVisite?: (visiteId: string, cascade?: boolean) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  planifie: <Clock className="h-3 w-3" />,
  effectue: <CheckCircle className="h-3 w-3 text-green-500" />,
  annule: <XCircle className="h-3 w-3 text-red-500" />,
};

export function PremiumAgentDayEvents({ 
  date, events, visites, clients, 
  onStatusChange, onDelete, onEdit, onMarquerEffectuee, onOpenDetail, onOpenEventDetail, onDeleteVisite 
}: PremiumAgentDayEventsProps) {
  if (!date) {
    return (
      <div className="relative h-full rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 overflow-hidden">
        {/* Particles */}
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
              Sélectionnez un jour
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              pour voir les événements
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : null;
  };

  const getTimeRemaining = (dateVisite: string) => {
    const now = new Date();
    const visiteDate = new Date(dateVisite);
    const timeDiff = visiteDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return { text: 'Passé', color: 'text-muted-foreground', urgent: false };
    }
    
    if (isToday(visiteDate)) {
      const hours = differenceInHours(visiteDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'text-green-500', urgent: true };
      if (hours <= 3) return { text: `Dans ${hours}h`, color: 'text-destructive', urgent: true };
      return { text: `Dans ${hours}h`, color: 'text-orange-500', urgent: false };
    }
    
    if (isTomorrow(visiteDate)) {
      return { text: 'Demain', color: 'text-blue-500', urgent: false };
    }
    
    const days = differenceInDays(visiteDate, now);
    return { text: `Dans ${days}j`, color: 'text-primary', urgent: false };
  };

  // Group visits by address and time to avoid duplicates
  const groupVisitesByAddressAndTime = (visites: any[]) => {
    const groups = new Map<string, any[]>();
    
    visites.forEach(visite => {
      const visiteDate = new Date(visite.date_visite);
      const timeKey = `${visiteDate.getHours()}:${visiteDate.getMinutes()}`;
      const key = `${visite.adresse}-${timeKey}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(visite);
    });
    
    return Array.from(groups.values());
  };

  const groupedVisites = groupVisitesByAddressAndTime(visites);

  // Combine events and grouped visites
  const allItems: { type: 'event' | 'visite-group'; data: any; eventType: string }[] = [];

  events.forEach((event) => {
    allItems.push({ type: 'event', data: event, eventType: event.event_type });
  });

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
    <div className="relative h-full rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 overflow-hidden flex flex-col">
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
      <div className="relative p-5 border-b border-border/50">
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
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                {allItems.length === 0 ? (
                  'Aucun événement'
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium text-foreground">{allItems.length}</span> élément{allItems.length > 1 ? 's' : ''}
                    {visites.length > 0 && (
                      <span className="text-blue-600 dark:text-blue-400"> • {visites.length} visite{visites.length > 1 ? 's' : ''}</span>
                    )}
                  </>
                )}
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

      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative inline-block mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-muted-foreground/50" />
                </div>
              </div>
              <p className="text-muted-foreground font-medium">Aucun événement</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Journée libre</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allItems.map((item, idx) => {
                if (item.type === 'visite-group') {
                  const group = item.data as any[];
                  const firstVisite = group[0];
                  const eventDate = new Date(firstVisite.date_visite);
                  const timeInfo = getTimeRemaining(firstVisite.date_visite);
                  const allEffectuees = group.every(v => v.statut === 'effectuee');
                  const isPast = allEffectuees || new Date(firstVisite.date_visite) < new Date();
                  const hasDeleguee = group.some(v => v.est_deleguee);

                  return (
                    <div
                      key={`visite-group-${firstVisite.id}-${idx}`}
                      className={cn(
                        'group relative rounded-xl bg-gradient-to-br from-card to-card/80 border overflow-hidden animate-fade-in transition-all duration-300',
                        timeInfo.urgent ? 'border-destructive/50 hover:border-destructive' : 
                        hasDeleguee ? 'border-green-500/50 hover:border-green-500' : 
                        'border-blue-500/30 hover:border-blue-500/60',
                        isPast && 'opacity-70'
                      )}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      
                      <div className="relative p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                Visite
                              </Badge>
                              {group.length > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {group.length} clients
                                </Badge>
                              )}
                              {hasDeleguee && (
                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                                  Déléguée
                                </Badge>
                              )}
                              {!isPast && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    timeInfo.urgent && "animate-pulse bg-destructive/10 text-destructive border-destructive/30"
                                  )}
                                >
                                  {timeInfo.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {timeInfo.text}
                                </Badge>
                              )}
                              {isPast && (
                                <Badge variant="secondary" className="text-xs">
                                  {allEffectuees ? 'Effectuée' : 'Passée'}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-bold mt-2 text-base group-hover:text-primary transition-colors">
                              {firstVisite.adresse}
                            </h4>
                          </div>
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
                            <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                              <Home className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                              <p className="text-xs text-muted-foreground">Pièces</p>
                              <p className="font-bold text-sm">{firstVisite.offres.pieces || '-'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                              <Maximize className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                              <p className="text-xs text-muted-foreground">Surface</p>
                              <p className="font-bold text-sm">{firstVisite.offres.surface || '-'} m²</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                              <Building className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                              <p className="text-xs text-muted-foreground">Prix</p>
                              <p className="font-bold text-sm">{firstVisite.offres.prix} CHF</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Clients list */}
                        {(() => {
                          const uniqueClients = getUniqueVisitesByClient(group);
                          return (
                            <div className="pt-3 border-t border-border/50">
                              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                                <Users className="h-3 w-3" />
                                {uniqueClients.length > 1 ? 'Clients concernés' : 'Client'}
                              </span>
                              <div className="space-y-1.5">
                                {uniqueClients.map((visite) => (
                                  <div 
                                    key={visite.client_id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <span className="text-sm font-medium truncate">
                                        {visite.est_deleguee && 'Pour '}
                                        {visite.client_profile?.prenom} {visite.client_profile?.nom}
                                      </span>
                                      {visite.statut === 'effectuee' && (
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      )}
                                      {visite.est_deleguee && (
                                        <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                          Déléguée
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 hover:bg-primary/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDetail(visite);
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Recommendations */}
                        {group.some(v => v.recommandation_agent) && (
                          <div className="flex flex-wrap gap-1.5">
                            {group.filter(v => v.recommandation_agent).map(visite => (
                              <div key={visite.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs">
                                <span className="text-muted-foreground">{visite.client_profile?.prenom}:</span>
                                {visite.recommandation_agent === 'recommande' && (
                                  <ThumbsUp className="h-3 w-3 text-green-600" />
                                )}
                                {visite.recommandation_agent === 'neutre' && (
                                  <Minus className="h-3 w-3 text-muted-foreground" />
                                )}
                                {visite.recommandation_agent === 'deconseille' && (
                                  <ThumbsDown className="h-3 w-3 text-red-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        {group.some(v => v.statut === 'planifiee') && !isPast && (
                          <div className="pt-3 border-t border-border/50 space-y-2">
                            {group.filter(v => v.statut === 'planifiee').map(visite => (
                              <Button
                                key={visite.id}
                                size="sm"
                                variant={timeInfo.urgent ? "destructive" : "outline"}
                                className={cn(
                                  "w-full text-xs h-9 transition-all",
                                  !timeInfo.urgent && "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarquerEffectuee(visite);
                                }}
                              >
                                {visite.est_deleguee ? (
                                  <>
                                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                    Feedback: {visite.client_profile?.prenom}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Effectuée: {visite.client_profile?.prenom}
                                  </>
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* Delete buttons */}
                        {onDeleteVisite && (
                          <div className="pt-2 border-t border-border/30">
                            {group.map(visite => {
                              const isClesRemises = visite.candidature?.statut === 'cles_remises' || visite.candidature?.cles_remises;
                              return (
                                <AlertDialog key={`delete-${visite.id}`}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Supprimer: {visite.client_profile?.prenom}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cette visite ?</AlertDialogTitle>
                                      <AlertDialogDescription asChild>
                                        <div>
                                          {isClesRemises ? (
                                            <>
                                              <span className="flex items-center gap-2 text-destructive font-medium mb-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                Cette visite est liée à une candidature terminée (clés remises).
                                              </span>
                                              <p>Voulez-vous aussi supprimer la transaction associée et réinitialiser le workflow de la candidature ?</p>
                                            </>
                                          ) : (
                                            <p>Cette action est irréversible.</p>
                                          )}
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      {isClesRemises && (
                                        <AlertDialogAction
                                          className="bg-orange-500 text-white hover:bg-orange-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteVisite(visite.id, true);
                                          }}
                                        >
                                          Supprimer avec cascade
                                        </AlertDialogAction>
                                      )}
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteVisite(visite.id, false);
                                        }}
                                      >
                                        {isClesRemises ? 'Supprimer visite seule' : 'Supprimer'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Event rendering
                const data = item.data;
                const eventDate = new Date(data.event_date);

                return (
                  <div
                    key={`event-${data.id}-${idx}`}
                    className={cn(
                      'group relative rounded-xl bg-gradient-to-br from-card to-card/80 border overflow-hidden animate-fade-in transition-all duration-300 hover:shadow-lg',
                      eventTypeColors[item.eventType],
                      'hover:scale-[1.01]'
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <div className="relative p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
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
                          </div>
                          <h4 className="font-bold mt-2 text-base group-hover:text-primary transition-colors">
                            {data.title}
                          </h4>
                          {!data.all_day && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{format(eventDate, 'HH:mm')}</span>
                            </div>
                          )}
                          {data.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {data.description}
                            </p>
                          )}
                          {data.client_id && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              {getClientName(data.client_id)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(data);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(data.id);
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

                      {/* Status actions */}
                      {onStatusChange && data.status !== 'effectue' && (
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
        </div>
      </ScrollArea>
    </div>
  );
}