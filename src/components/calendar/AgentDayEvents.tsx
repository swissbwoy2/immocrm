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
  onDeleteVisite?: (visiteId: string, cascade?: boolean) => void;
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
  onStatusChange, onDelete, onEdit, onMarquerEffectuee, onOpenDetail, onOpenEventDetail, onDeleteVisite 
}: AgentDayEventsProps) {
  if (!date) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-6 h-full flex flex-col items-center justify-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 animate-pulse-soft">
          <Calendar className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-center font-medium">
          Sélectionnez un jour
        </p>
        <p className="text-muted-foreground/60 text-sm text-center mt-1">
          pour voir les événements
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

  // Group visits by address and time to avoid duplicates
  const groupVisitesByAddressAndTime = (visites: any[]) => {
    const groups = new Map<string, any[]>();
    
    visites.forEach(visite => {
      // Key = address + exact time (rounded to minute)
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
    <div className="bg-card rounded-xl border shadow-sm h-full flex flex-col animate-fade-in">
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <span className="capitalize">{format(date, 'EEEE d MMMM', { locale: fr })}</span>
        </h3>
        <p className="text-sm text-muted-foreground mt-1 ml-9">
          {allItems.length === 0 ? (
            'Aucun événement'
          ) : (
            <>
              <span className="font-medium text-foreground">{allItems.length}</span> élément{allItems.length > 1 ? 's' : ''}
              {visites.length > 0 && (
                <span className="text-blue-600 dark:text-blue-400"> • {visites.length} visite{visites.length > 1 ? 's' : ''}</span>
              )}
            </>
          )}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Aucun événement</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Journée libre</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                const isEvent = item.type === 'event';
                
                if (item.type === 'visite-group') {
                  // Render grouped visites
                  const group = item.data as any[];
                  const firstVisite = group[0];
                  const eventDate = new Date(firstVisite.date_visite);
                  const urgency = getVisiteUrgency(firstVisite.date_visite);
                  const isUrgent = urgency?.level === 'critical';
                  const allEffectuees = group.every(v => v.statut === 'effectuee');
                  const isPast = allEffectuees || new Date(firstVisite.date_visite) < new Date();
                  const hasDeleguee = group.some(v => v.est_deleguee);

                  return (
                    <div
                      key={`visite-group-${firstVisite.id}-${idx}`}
                      className={cn(
                        'p-3 rounded-lg border',
                        isUrgent ? 'border-destructive/50 bg-destructive/5' : 
                        hasDeleguee ? 'border-green-500/50 bg-green-500/5' : 
                        'bg-blue-500/10 border-blue-500/30',
                        isPast && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs pointer-events-none">Visite</Badge>
                            {group.length > 1 && (
                              <Badge variant="secondary" className="text-xs pointer-events-none">
                                {group.length} clients
                              </Badge>
                            )}
                            {hasDeleguee && (
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
                                {allEffectuees ? 'Effectuée' : 'Passée'}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium mt-1 break-words">{firstVisite.adresse}</h4>
                          <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(eventDate, 'HH:mm')}
                          </p>
                          {firstVisite.offres && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {firstVisite.offres.pieces} pièces • {firstVisite.offres.surface}m² • {firstVisite.offres.prix} CHF
                            </p>
                          )}
                          
                          {/* Liste des clients concernés (dédupliqués) */}
                          {(() => {
                            const uniqueClients = getUniqueVisitesByClient(group);
                            return (
                              <div className="mt-2 pt-2 border-t border-current/10">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {uniqueClients.length > 1 ? 'Clients concernés :' : 'Client :'}
                                </span>
                                <ul className="mt-1 space-y-1">
                                  {uniqueClients.map((visite) => (
                                    <li 
                                      key={visite.client_id}
                                      className="flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="flex items-center gap-1 min-w-0">
                                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                          {visite.est_deleguee && 'Pour '}
                                          {visite.client_profile?.prenom} {visite.client_profile?.nom}
                                        </span>
                                        {visite.statut === 'effectuee' && (
                                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                        )}
                                        {visite.est_deleguee && (
                                          <Badge className="text-[10px] h-4 px-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Délég.</Badge>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenDetail(visite);
                                        }}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Recommandations si présentes */}
                          {group.some(v => v.recommandation_agent) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {group.filter(v => v.recommandation_agent).map(visite => (
                                <div key={visite.id} className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {visite.client_profile?.prenom}:
                                  </span>
                                  {visite.recommandation_agent === 'recommande' && (
                                    <ThumbsUp className="h-3 w-3 text-green-600" />
                                  )}
                                  {visite.recommandation_agent === 'neutre' && (
                                    <Minus className="h-3 w-3 text-gray-500" />
                                  )}
                                  {visite.recommandation_agent === 'deconseille' && (
                                    <ThumbsDown className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions pour les visites non effectuées */}
                      {group.some(v => v.statut === 'planifiee') && !isPast && (
                        <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                          {group.filter(v => v.statut === 'planifiee').map(visite => (
                            <Button
                              key={visite.id}
                              size="sm"
                              variant={isUrgent ? "destructive" : "outline"}
                              className="w-full text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarquerEffectuee(visite);
                              }}
                            >
                              {visite.est_deleguee ? (
                                <>
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Feedback: {visite.client_profile?.prenom}
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Effectuée: {visite.client_profile?.prenom}
                                </>
                              )}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      {/* Boutons de suppression */}
                      {onDeleteVisite && (
                        <div className="mt-2 pt-2 border-t border-current/10">
                          {group.map(visite => {
                            const isClesRemises = visite.candidature?.statut === 'cles_remises' || visite.candidature?.cles_remises;
                            return (
                              <AlertDialog key={`delete-${visite.id}`}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                                          <p>Cette action supprimera la visite pour {visite.client_profile?.prenom} {visite.client_profile?.nom} à {visite.adresse}. Cette action est irréversible.</p>
                                        )}
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className={isClesRemises ? "flex-col sm:flex-row gap-2" : ""}>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    {isClesRemises ? (
                                      <>
                                        <AlertDialogAction
                                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                          onClick={() => onDeleteVisite(visite.id, false)}
                                        >
                                          Visite seule
                                        </AlertDialogAction>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => onDeleteVisite(visite.id, true)}
                                        >
                                          Tout supprimer
                                        </AlertDialogAction>
                                      </>
                                    ) : (
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => onDeleteVisite(visite.id, false)}
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Render calendar event
                const data = item.data;
                const eventDate = new Date(data.event_date);
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
                        <h4 className="font-medium mt-1 break-words">{data.title}</h4>
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
