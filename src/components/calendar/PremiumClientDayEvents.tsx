import { differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { toSwissTime, formatSwissDate, formatSwissTime } from '@/lib/dateUtils';
import { 
  Calendar, Clock, Home, Maximize, User, Phone, KeyRound, 
  Check, X, FileCheck, ThumbsUp, ThumbsDown, Minus, Eye,
  Building, ExternalLink, ArrowRight, Lightbulb, MessageSquareText, Hourglass
} from 'lucide-react';
import { AddressLink } from '@/components/AddressLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors } from './types';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddToCalendarButton } from './AddToCalendarButton';
import { buildVisiteICSDescription } from '@/utils/generateICS';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

interface PremiumClientDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  onMarquerEffectuee: (visite: any) => void;
  onAccepterOffre: (visite: any) => void;
  onRefuserOffre: (visite: any) => void;
  onVoirOffre: () => void;
  /** Opens the full detail dialog for a visite or an event */
  onOpenDetail?: (data: any, type: 'event' | 'visite') => void;
  /** Parcours achat : prix de vente (pas de loyer) et « faire une offre » au lieu de « candidater ». */
  isAchat?: boolean;
}

export function PremiumClientDayEvents({ 
  date, events, visites, 
  onMarquerEffectuee, onAccepterOffre, onRefuserOffre, onVoirOffre, onOpenDetail, isAchat = false
}: PremiumClientDayEventsProps) {
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

  const getTimeRemaining = (eventDate: Date) => {
    const now = new Date();
    const swissDate = toSwissTime(eventDate);
    
    if (swissDate < now) {
      return { text: 'Passé', color: 'bg-muted text-muted-foreground' };
    }
    
    if (isToday(swissDate)) {
      const hours = differenceInHours(swissDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };
      return { text: `Dans ${hours}h`, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' };
    }
    
    if (isTomorrow(swissDate)) {
      return { text: 'Demain', color: 'bg-primary/10 text-primary' };
    }
    
    const days = differenceInDays(swissDate, now);
    if (days <= 7) {
      return { text: `Dans ${days} jour${days > 1 ? 's' : ''}`, color: 'bg-primary/10 text-primary' };
    }
    
    return { text: `Dans ${days} jours`, color: 'bg-muted text-muted-foreground' };
  };

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { 
        icon: ThumbsUp, 
        label: 'Recommandé', 
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent' 
      },
      neutre: { 
        icon: Minus, 
        label: 'Neutre', 
        className: 'bg-muted text-muted-foreground border-transparent' 
      },
      deconseille: { 
        icon: ThumbsDown, 
        label: 'Déconseillé', 
        className: 'bg-destructive/10 text-destructive border-transparent' 
      }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("gap-1 rounded-full text-xs font-semibold", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusConfig = (visite: any) => {
    const isEffectuee = visite.statut === 'effectuee' || visite.offres?.statut === 'visite_effectuee';
    
    if (isEffectuee) {
      return {
        label: 'Visite effectuée',
        icon: Check,
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent'
      };
    }
    
    return {
      label: 'Visite planifiée',
      icon: Calendar,
      className: 'bg-primary/10 text-primary border-transparent'
    };
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
                {formatSwissDate(date, 'EEEE d MMMM')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatSwissDate(date, 'yyyy')}
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

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <div className="text-center py-12">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">
                Aucun événement ce jour
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                const isEvent = item.type === 'event';
                const data = item.data;
                const eventDate = toSwissTime(isEvent ? data.event_date : data.date_visite);
                const timeRemaining = getTimeRemaining(eventDate);

                if (!isEvent) {
                  // Premium Visite Card
                  const statusConfig = getStatusConfig(data);
                  const StatusIcon = statusConfig.icon;
                  const isEffectuee = data.statut === 'effectuee' || data.offres?.statut === 'visite_effectuee';
                  const isVisiteDatePassed = new Date(data.date_visite) <= new Date();
                  const showPostVisitActions = isEffectuee && 
                    isVisiteDatePassed &&
                    data.offres?.statut !== 'interesse' && 
                    data.offres?.statut !== 'refusee' && 
                    data.offres?.statut !== 'candidature_deposee' &&
                    data.offres?.statut !== 'offre_envisagee' &&
                    data.offres?.statut !== 'acceptee';

                  return (
                    <div
                      key={`visite-${data.id}-${idx}`}
                      className="rounded-xl border border-border/70 bg-card overflow-hidden transition-colors hover:border-foreground/30"
                    >
                      <div className="p-4 space-y-4">
                        {/* Header with address and price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <AddressLink 
                              address={data.adresse}
                              className="text-base font-semibold leading-tight truncate text-foreground"
                              showIcon={false}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className={cn("gap-1 rounded-full text-xs font-semibold", statusConfig.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                              {data.est_deleguee && (
                                <Badge variant="outline" className="rounded-full text-xs font-semibold bg-muted text-muted-foreground border-transparent">
                                  Déléguée
                                </Badge>
                              )}
                              {data.recommandation_agent && getRecommandationBadge(data.recommandation_agent)}
                            </div>
                          </div>
                          {data.offres && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-[15px] font-semibold text-foreground">
                                {data.offres.prix?.toLocaleString('fr-CH')}
                              </p>
                              <p className="text-xs text-muted-foreground">{isAchat ? 'CHF · prix de vente' : 'CHF/mois'}</p>
                            </div>
                          )}
                        </div>

                        {/* Date & Time Card */}
                        <div className="p-3 rounded-xl bg-muted/60">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Calendar className="w-[18px] h-[18px]" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground">
                                  {formatSwissDate(eventDate, "EEEE d MMMM")}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatSwissTime(eventDate)}
                                </p>
                              </div>
                            </div>
                            <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold", timeRemaining.color)}>
                              {timeRemaining.text}
                            </span>
                          </div>
                        </div>

                        {/* Property details */}
                        {data.offres && (
                          <div className="grid grid-cols-3 gap-2">
                            {data.offres.pieces && (
                              <div className="p-2.5 rounded-xl border border-border/70 text-center">
                                <Home className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Pièces</p>
                                <p className="font-semibold text-sm text-foreground">{data.offres.pieces}</p>
                              </div>
                            )}
                            {data.offres.surface && (
                              <div className="p-2.5 rounded-xl border border-border/70 text-center">
                                <Maximize className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Surface</p>
                                <p className="font-semibold text-sm text-foreground">{data.offres.surface} m²</p>
                              </div>
                            )}
                            {data.offres.etage && (
                              <div className="p-2.5 rounded-xl border border-border/70 text-center">
                                <Building className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Étage</p>
                                <p className="font-semibold text-sm text-foreground">{data.offres.etage}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Practical info */}
                        {data.offres && (data.offres.code_immeuble || data.offres.concierge_nom) && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <KeyRound className="w-3 h-3" />
                              Informations pratiques
                            </p>
                            <div className="grid gap-2">
                              {data.offres.code_immeuble && (
                                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/70">
                                  <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Code immeuble</p>
                                    <p className="font-mono font-semibold text-sm text-foreground">{data.offres.code_immeuble}</p>
                                  </div>
                                </div>
                              )}
                              {data.offres.concierge_nom && (
                                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/70">
                                  <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Concierge</p>
                                    <p className="font-medium text-sm">{data.offres.concierge_nom}</p>
                                    {data.offres.concierge_tel && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" />
                                        {data.offres.concierge_tel}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Agent feedback */}
                        {data.feedback_agent && (
                          <div className="p-3 rounded-xl bg-muted/60">
                            <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                              <MessageSquareText className="w-3 h-3" />
                              Feedback de l'agent
                            </p>
                            <p className="text-sm">{data.feedback_agent}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {data.notes && (
                          <div className="p-3 rounded-xl bg-amber-500/10">
                            <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{data.notes}</span>
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3 pt-3 border-t border-border/70">
                          {/* Add to calendar button */}
                          <AddToCalendarButton
                            event={{
                              uid: `${data.id}@immocrm`,
                              title: `Visite - ${data.adresse}`,
                              description: buildVisiteICSDescription({
                                adresse: data.adresse,
                                prix: data.offres?.prix ? (isAchat ? `CHF ${Number(data.offres.prix).toLocaleString('fr-CH')} (prix de vente)` : `${data.offres.prix} CHF/mois`) : undefined,
                                pieces: data.offres?.pieces,
                                surface: data.offres?.surface,
                                etage: data.offres?.etage,
                                notes: data.notes,
                                lien_annonce: data.offres?.lien_annonce,
                                description: data.offres?.description,
                              }),
                              location: data.adresse,
                              startDate: new Date(data.date_visite),
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full rounded-full"
                          />
                          {data.statut === 'planifiee' && data.offres?.statut !== 'visite_effectuee' && isVisiteDatePassed && (
                            <Button 
                              onClick={() => onMarquerEffectuee(data)}
                              className="w-full rounded-full"
                              size="sm"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Marquer comme effectuée
                            </Button>
                          )}
                          {data.statut === 'planifiee' && !isVisiteDatePassed && (
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                              <p className="text-xs text-amber-700 dark:text-amber-400 text-center flex items-center justify-center gap-1">
                                <Hourglass className="w-3 h-3" />
                                Actions disponibles après la visite
                              </p>
                            </div>
                          )}

                          {showPostVisitActions && (
                            <div className="p-3 rounded-xl border border-border/70 space-y-3">
                              <p className="text-xs font-semibold text-center text-muted-foreground">
                                {isAchat ? "Suite à cette visite, souhaitez-vous faire une offre d'achat ?" : 'Suite à cette visite, souhaitez-vous donner suite ?'}
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => onAccepterOffre(data)}
                                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  {isAchat ? 'Offre' : 'Oui'}
                                </Button>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={onVoirOffre}
                                  className="rounded-full"
                                >
                                  <FileCheck className="mr-1 h-3 w-3" />
                                  {isAchat ? 'Voir le bien' : 'Candidater'}
                                </Button>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onRefuserOffre(data)}
                                  className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Non
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {onOpenDetail && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onOpenDetail(data, 'visite')}
                                className="flex-1 min-w-0 rounded-full"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Voir le détail
                              </Button>
                            )}
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={onVoirOffre}
                              className="flex-1 min-w-0 rounded-full"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {isAchat ? 'Voir le bien' : "Voir l'offre"}
                              <ArrowRight className="ml-auto h-4 w-4" />
                            </Button>
                            {data.offres?.lien_annonce && (
                              <LinkPreviewCard url={data.offres.lien_annonce} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Render calendar event
                return (
                  <div
                    key={`event-${data.id}-${idx}`}
                    role={onOpenDetail ? 'button' : undefined}
                    tabIndex={onOpenDetail ? 0 : undefined}
                    onClick={onOpenDetail ? () => onOpenDetail(data, 'event') : undefined}
                    onKeyDown={
                      onOpenDetail
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onOpenDetail(data, 'event');
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'p-4 rounded-xl border',
                      onOpenDetail && 'cursor-pointer hover:border-foreground/30 transition-colors',
                      eventTypeColors[item.eventType]
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-full text-xs bg-background/70">
                        {eventTypeLabels[item.eventType] || 'Événement'}
                      </Badge>
                    </div>
                    <h4 className="text-base font-semibold mt-2">{data.title}</h4>
                    {!data.all_day && (
                      <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatSwissTime(eventDate)}
                      </p>
                    )}
                    {data.description && (
                      <p className="text-sm text-muted-foreground mt-2">{data.description}</p>
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