import { differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { toSwissTime, formatSwissDate, formatSwissTime } from '@/lib/dateUtils';
import { formatZurichDay, formatZurichTime, formatZurichTimeRange } from '@/lib/dateZurich';
import { 
  Calendar, Clock, User, MapPin, CheckCircle, XCircle, Trash2,
  MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Minus, Eye, Pencil,
  Home, Maximize, Building, Users, Download
} from 'lucide-react';
import { AddToCalendarButton } from './AddToCalendarButton';
import { downloadMultiEventICSFile, buildVisiteICSDescription, type ICSEventData } from '@/utils/generateICS';
import { buildStableVisiteUID, groupVisitesByPhysique } from '@/utils/visitesCalculator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors, priorityColors } from './types';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
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
  effectue: <CheckCircle className="h-3 w-3 text-emerald-600" />,
  annule: <XCircle className="h-3 w-3 text-destructive" />,
};

export function PremiumAgentDayEvents({ 
  date, events, visites, clients, 
  onStatusChange, onDelete, onEdit, onMarquerEffectuee, onOpenDetail, onOpenEventDetail, onDeleteVisite 
}: PremiumAgentDayEventsProps) {
  if (!date) {
    return (
      <div className={cn(DASH_CARD, 'h-full overflow-hidden')}>
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="w-7 h-7 text-primary" />
            </span>
            <p className="text-base font-semibold text-foreground">
              Sélectionnez un jour
            </p>
            <p className="text-muted-foreground text-sm mt-1">
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
      return { text: 'Passé', color: 'bg-muted text-muted-foreground', urgent: false };
    }
    
    if (isToday(visiteDate)) {
      const hours = differenceInHours(visiteDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', urgent: true };
      if (hours <= 3) return { text: `Dans ${hours}h`, color: 'bg-destructive/10 text-destructive', urgent: true };
      return { text: `Dans ${hours}h`, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', urgent: false };
    }
    
    if (isTomorrow(visiteDate)) {
      return { text: 'Demain', color: 'bg-primary/10 text-primary', urgent: false };
    }
    
    const days = differenceInDays(visiteDate, now);
    return { text: `Dans ${days}j`, color: 'bg-primary/10 text-primary', urgent: false };
  };

  // Group visits by address and time to avoid duplicates
  const groupVisitesByAddressAndTime = (visites: any[]) => {
    const groups = new Map<string, any[]>();
    
    visites.forEach(visite => {
      const timeKey = formatZurichTime(visite.date_visite);
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
                {formatSwissDate(date, 'EEEE d MMMM')}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {allItems.length === 0 ? (
                  'Aucun événement'
                ) : (
                  <>
                    <span className="font-medium text-foreground">{allItems.length}</span> élément{allItems.length > 1 ? 's' : ''}
                    {visites.length > 0 && (
                      <span> • {visites.length} visite{visites.length > 1 ? 's' : ''}</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex shrink-0 items-center gap-2">
            {allItems.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const icsEvents: ICSEventData[] = [];
                    // Regrouper les visites multi-clients (même adresse + même date)
                    const groups = groupVisitesByPhysique(visites as any[]);
                    groups.forEach(g => {
                      const v: any = g.representative;
                      const clients = g.items
                        .map((it: any) => it.client_profile ? `${it.client_profile.prenom} ${it.client_profile.nom}` : null)
                        .filter(Boolean)
                        .join(', ');
                      const suffix = g.count > 1 ? ` (${g.count} clients)` : '';
                      icsEvents.push({
                        uid: buildStableVisiteUID(v.adresse, v.date_visite),
                        title: `Visite - ${v.adresse}${suffix}`,
                        description: clients,
                        location: v.adresse,
                        startDate: new Date(v.date_visite),
                      });
                    });
                    events.forEach(ev => {
                      icsEvents.push({
                        title: ev.title,
                        description: ev.description || '',
                        startDate: new Date(ev.event_date),
                        endDate: ev.end_date ? new Date(ev.end_date) : undefined,
                        allDay: ev.all_day,
                      });
                    });
                    if (icsEvents.length === 0) return;
                    const dateStr = formatSwissDate(date, 'yyyy-MM-dd');
                    downloadMultiEventICSFile(icsEvents, `calendrier_${dateStr}.ics`);
                  }}
                  className="gap-1.5 rounded-full"
                  title="Exporter tous les événements du jour"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden md:inline">Exporter</span>
                </Button>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                  {allItems.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <div className="text-center py-12">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">Aucun événement</p>
              <p className="text-muted-foreground text-xs mt-1">Journée libre</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                if (item.type === 'visite-group') {
                  const group = item.data as any[];
                  const firstVisite = group[0];
                  const eventDate = new Date(firstVisite.date_visite);
                  const timeInfo = getTimeRemaining(firstVisite.date_visite);
                  const allEffectuees = group.every(v => v.statut === 'effectuee');
                  const isPast = allEffectuees || new Date(firstVisite.date_visite) < new Date();
                  const hasDeleguee = group.some(v => v.est_deleguee);
                  const isShared = group.every(v => v.is_shared);
                  const sharedByName = isShared ? (firstVisite.shared_by_name || 'Co-agent') : null;

                  return (
                    <div
                      key={`visite-group-${firstVisite.id}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenDetail(firstVisite)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenDetail(firstVisite);
                        }
                      }}
                      className={cn(
                        'group relative rounded-xl border bg-card overflow-hidden transition-colors cursor-pointer',
                        isShared ? 'border-dashed border-purple-500/40 hover:border-purple-500/70' :
                        timeInfo.urgent ? 'border-destructive/40 hover:border-destructive/70' : 
                        hasDeleguee ? 'border-emerald-500/40 hover:border-emerald-500/70' : 
                        'border-border/70 hover:border-foreground/30',
                        isPast && 'opacity-70',
                        isShared && 'opacity-90'
                      )}
                    >
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent">
                                Visite
                              </Badge>
                              {isShared && (
                                <Badge
                                  variant="outline"
                                  className="rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent"
                                  title={`Visite créée par ${sharedByName} (co-agent) — lecture seule`}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Co-agent : {sharedByName}
                                </Badge>
                              )}
                              {group.length > 1 && (
                                <Badge variant="secondary" className="rounded-full text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {group.length} clients
                                </Badge>
                              )}
                              {hasDeleguee && (
                                <Badge className="rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 border-0">
                                  Déléguée
                                </Badge>
                              )}
                              {!isPast && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "rounded-full border-transparent text-xs font-semibold",
                                    timeInfo.color
                                  )}
                                >
                                  {timeInfo.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {timeInfo.text}
                                </Badge>
                              )}
                              {isPast && (
                                <Badge variant="secondary" className="rounded-full text-xs">
                                  {allEffectuees ? 'Effectuée' : 'Passée'}
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-base font-semibold mt-2 text-foreground">
                              {firstVisite.adresse}
                            </h4>
                          </div>
                        </div>

                        {/* Date & Time Card */}
                        <div className="p-3 rounded-xl bg-muted/60">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Clock className="w-[18px] h-[18px]" />
                            </span>
                            <div>
                              <p className="font-semibold text-sm">
                                {formatZurichTimeRange(firstVisite.date_visite, firstVisite.date_visite_fin)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatZurichDay(firstVisite.date_visite, { year: false })}
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
                        
                        {/* Clients list */}
                        {(() => {
                          const uniqueClients = getUniqueVisitesByClient(group);
                          return (
                            <div className="pt-3 border-t border-border/70">
                              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                                <Users className="h-3 w-3" />
                                {uniqueClients.length > 1 ? 'Clients concernés' : 'Client'}
                              </span>
                              <div className="space-y-1.5">
                                {uniqueClients.map((visite) => (
                                  <div 
                                    key={visite.client_id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/70"
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
                                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                      )}
                                      {visite.est_deleguee && (
                                        <Badge className="rounded-full text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
                                          Déléguée
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 rounded-full hover:bg-primary/10"
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

                        {/* Live de visite (Phase B) */}
                        <div className="pt-3 border-t border-border/70" onClick={(e) => e.stopPropagation()}>
                          <VisitLiveButton visiteId={firstVisite.id} className="w-full rounded-full" />
                        </div>

                        {/* Recommendations */}
                        {group.some(v => v.recommandation_agent) && (
                          <div className="flex flex-wrap gap-1.5">
                            {group.filter(v => v.recommandation_agent).map(visite => (
                              <div key={visite.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
                                <span className="text-muted-foreground">{visite.client_profile?.prenom}:</span>
                                {visite.recommandation_agent === 'recommande' && (
                                  <ThumbsUp className="h-3 w-3 text-emerald-600" />
                                )}
                                {visite.recommandation_agent === 'neutre' && (
                                  <Minus className="h-3 w-3 text-muted-foreground" />
                                )}
                                {visite.recommandation_agent === 'deconseille' && (
                                  <ThumbsDown className="h-3 w-3 text-destructive" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add to Calendar */}
                        <AddToCalendarButton
                          event={{
                            uid: buildStableVisiteUID(firstVisite.adresse, firstVisite.date_visite),
                            title: `Visite - ${firstVisite.adresse}`,
                            description: buildVisiteICSDescription({
                              clients: group.map((v: any) => {
                                const c = clients.find(cl => cl.id === v.client_id);
                                return c ? `${c.profiles.prenom} ${c.profiles.nom}` : 'Inconnu';
                              }).join(', '),
                              adresse: firstVisite.adresse,
                              prix: firstVisite.offres?.prix ? `${firstVisite.offres.prix} CHF/mois` : undefined,
                              pieces: firstVisite.offres?.pieces,
                              surface: firstVisite.offres?.surface,
                              etage: firstVisite.offres?.etage,
                              notes: firstVisite.notes,
                              lien_annonce: firstVisite.offres?.lien_annonce,
                            }),
                            location: firstVisite.adresse,
                            startDate: new Date(firstVisite.date_visite),
                          }}
                          size="sm"
                          variant="outline"
                          className="w-full rounded-full"
                        />

                        {/* Action buttons */}
                        {!isShared && group.some(v => v.statut === 'planifiee') && !isPast && (
                          <div className="pt-3 border-t border-border/70 space-y-2">
                            {group.filter(v => v.statut === 'planifiee').map(visite => (
                              <Button
                                key={visite.id}
                                size="sm"
                                variant={timeInfo.urgent ? "destructive" : "outline"}
                                className={cn(
                                  "w-full text-xs h-9 rounded-full",
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
                        {!isShared && onDeleteVisite && (
                          <div className="pt-2 border-t border-border/70">
                            {group.map(visite => {
                              const isClesRemises = visite.candidature?.statut === 'cles_remises' || visite.candidature?.cles_remises;
                              return (
                                <AlertDialog key={`delete-${visite.id}`}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full text-xs h-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
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
                                          className="bg-amber-500 text-white hover:bg-amber-600"
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
                const eventIsShared = !!data.is_shared;
                const eventSharedByName = eventIsShared ? (data.shared_by_name || 'Co-agent') : null;

                return (
                  <div
                    key={`event-${data.id}-${idx}`}
                    className={cn(
                      'group relative rounded-xl border overflow-hidden transition-colors',
                      eventIsShared
                        ? 'border-dashed border-purple-500/40 hover:border-purple-500/70 bg-card opacity-90'
                        : eventTypeColors[item.eventType]
                    )}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="rounded-full text-xs font-medium bg-background/70">
                              {eventTypeLabels[item.eventType]}
                            </Badge>
                            {eventIsShared && (
                              <Badge
                                variant="outline"
                                className="rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent"
                                title={`Événement créé par ${eventSharedByName} (co-agent) — lecture seule`}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Co-agent : {eventSharedByName}
                              </Badge>
                            )}
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
                          </div>
                          <h4 className="text-base font-semibold mt-2 text-foreground">
                            {data.title}
                          </h4>
                          {!data.all_day && formatZurichTime(data.event_date) && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{formatZurichTime(data.event_date)}</span>
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
                          {!eventIsShared && onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(data);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {!eventIsShared && onDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
                      {!eventIsShared && onStatusChange && data.status !== 'effectue' && (
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
        </div>
      </ScrollArea>
    </div>
  );
}