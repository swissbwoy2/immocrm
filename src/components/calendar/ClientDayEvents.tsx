import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatZurichDay, formatZurichTime, formatZurichTimeRange } from '@/lib/dateZurich';
import { 
  Calendar, Clock, MapPin, Home, Maximize, User, Phone, KeyRound, 
  Check, X, FileCheck, ThumbsUp, ThumbsDown, Minus, Lightbulb, Hourglass, MessageSquareText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors } from './types';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

interface ClientDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  onMarquerEffectuee: (visite: any) => void;
  onAccepterOffre: (visite: any) => void;
  onRefuserOffre: (visite: any) => void;
  onVoirOffre: () => void;
}

export function ClientDayEvents({ 
  date, events, visites, 
  onMarquerEffectuee, onAccepterOffre, onRefuserOffre, onVoirOffre 
}: ClientDayEventsProps) {
  if (!date) {
    return (
      <div className={cn(DASH_CARD, 'p-6 h-full flex flex-col items-center justify-center')}>
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-7 w-7 text-primary" />
        </span>
        <p className="text-sm text-muted-foreground text-center">
          Sélectionnez un jour pour voir les événements
        </p>
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

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { icon: ThumbsUp, label: 'Recommandé', variant: 'default' as const, className: 'border-transparent bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400' },
      neutre: { icon: Minus, label: 'Neutre', variant: 'secondary' as const, className: 'border-transparent bg-muted text-muted-foreground' },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', variant: 'destructive' as const, className: 'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/10' }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={cn("gap-1 rounded-full text-xs font-semibold", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className={cn(DASH_CARD, 'h-full overflow-hidden flex flex-col')}>
      <div className="p-4 md:p-5 border-b border-border/70">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </span>
          <span className="capitalize">{format(date, 'EEEE d MMMM yyyy', { locale: fr })}</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1 ml-[52px]">
          {allItems.length} événement{allItems.length > 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
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
              const eventDate = new Date(isEvent ? data.event_date : data.date_visite);

              if (!isEvent) {
                // Render visite with full details
                const isEffectuee = data.statut === 'effectuee' || data.offres?.statut === 'visite_effectuee';
                const isVisiteDatePassed = new Date(data.date_visite) <= new Date();
                const showPostVisitActions = isEffectuee && 
                  isVisiteDatePassed &&
                  data.offres?.statut !== 'interesse' && 
                  data.offres?.statut !== 'refusee' && 
                  data.offres?.statut !== 'candidature_deposee';

                return (
                  <div
                    key={`visite-${data.id}-${idx}`}
                    className="p-4 rounded-xl border border-border/70 bg-card space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-foreground">{data.adresse}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="rounded-full text-xs font-semibold border-transparent bg-primary/10 text-primary">
                            {data.statut === 'planifiee' ? 'Visite planifiée' : 'Visite effectuée'}
                          </Badge>
                          {data.est_deleguee && (
                            <Badge variant="outline" className="rounded-full text-xs font-semibold border-transparent bg-muted text-muted-foreground">Déléguée</Badge>
                          )}
                          {data.recommandation_agent && getRecommandationBadge(data.recommandation_agent)}
                        </div>
                      </div>
                      {data.offres && (
                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-semibold text-foreground">
                            {data.offres.prix?.toLocaleString('fr-CH')} CHF
                          </p>
                          <p className="text-xs text-muted-foreground">par mois</p>
                        </div>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div className="p-3 rounded-xl bg-muted/60">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Calendar className="w-[18px] h-[18px]" />
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {formatZurichDay(data.date_visite)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatZurichTimeRange(data.date_visite, data.date_visite_fin)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Property details */}
                    {data.offres && (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Pièces</p>
                            <p className="font-semibold text-foreground">{data.offres.pieces}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Maximize className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Surface</p>
                            <p className="font-semibold text-foreground">{data.offres.surface} m²</p>
                          </div>
                        </div>
                        {data.offres.etage && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Étage</p>
                              <p className="font-semibold text-foreground">{data.offres.etage}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Practical info */}
                    {data.offres && (data.offres.code_immeuble || data.offres.concierge_nom) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><KeyRound className="w-3 h-3" />Informations pratiques</p>
                        <div className="grid grid-cols-1 gap-2">
                          {data.offres.code_immeuble && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 text-sm">
                              <KeyRound className="w-4 h-4 text-primary" />
                              <span className="text-muted-foreground">Code:</span>
                              <span className="font-mono font-semibold">{data.offres.code_immeuble}</span>
                            </div>
                          )}
                          {data.offres.concierge_nom && (
                            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border/70 text-sm">
                              <User className="w-4 h-4 text-primary" />
                              <span>{data.offres.concierge_nom}</span>
                              {data.offres.concierge_tel && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {data.offres.concierge_tel}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Agent feedback */}
                    {data.feedback_agent && (
                      <div className="p-3 rounded-xl bg-muted/60">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><MessageSquareText className="w-3 h-3" />Feedback de l'agent:</p>
                        <p className="text-sm">{data.feedback_agent}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {data.notes && (
                      <div className="p-3 rounded-xl bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{data.notes}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3 pt-3 border-t border-border/70">
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
                        <div className="p-2 bg-amber-500/10 rounded-xl text-xs text-amber-700 dark:text-amber-400 text-center flex items-center justify-center gap-1">
                          <Hourglass className="w-3 h-3" />
                          Actions disponibles après la visite
                        </div>
                      )}

                      {showPostVisitActions && (
                        <div className="p-3 rounded-xl border border-border/70 space-y-3">
                          <p className="text-xs font-semibold text-center text-muted-foreground">
                            Suite à cette visite, souhaitez-vous donner suite ?
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <Button 
                              variant="default"
                              size="sm"
                              className="rounded-full"
                              onClick={() => onAccepterOffre(data)}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Intéressé
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={onVoirOffre}
                            >
                              <FileCheck className="mr-1 h-3 w-3" />
                              Candidature
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => onRefuserOffre(data)}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={onVoirOffre}
                          className="flex-1 rounded-full"
                        >
                          Voir l'offre
                        </Button>
                        {data.offres?.lien_annonce && (
                          <LinkPreviewCard url={data.offres.lien_annonce} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Render calendar event (minimal for clients)
              return (
                <div
                  key={`event-${data.id}-${idx}`}
                  className={cn('p-4 rounded-xl border', eventTypeColors[item.eventType])}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="rounded-full text-xs bg-background/70">
                      {eventTypeLabels[item.eventType] || 'Événement'}
                    </Badge>
                  </div>
                  <h4 className="text-base font-semibold mt-2">{data.title}</h4>
                  {!data.all_day && formatZurichTime(data.event_date) && (
                    <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatZurichTime(data.event_date)}
                    </p>
                  )}
                  {data.description && (
                    <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
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
