import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, MapPin, Home, Maximize, User, Phone, KeyRound, 
  Check, X, FileCheck, ExternalLink, ThumbsUp, ThumbsDown, Minus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './CalendarView';

interface ClientDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  onMarquerEffectuee: (visite: any) => void;
  onAccepterOffre: (visite: any) => void;
  onRefuserOffre: (visite: any) => void;
  onVoirOffre: () => void;
}

const eventTypeLabels: Record<string, string> = {
  visite: 'Visite',
  rappel: 'Rappel',
  rendez_vous: 'Rendez-vous',
  autre: 'Autre',
};

const eventTypeColors: Record<string, string> = {
  visite: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  rappel: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
  rendez_vous: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  autre: 'bg-gray-500/10 text-gray-700 border-gray-500/30 dark:text-gray-400',
};

export function ClientDayEvents({ 
  date, events, visites, 
  onMarquerEffectuee, onAccepterOffre, onRefuserOffre, onVoirOffre 
}: ClientDayEventsProps) {
  if (!date) {
    return (
      <div className="bg-card rounded-lg border p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-center">
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
      recommande: { icon: ThumbsUp, label: 'Recommandé', variant: 'default' as const, className: 'bg-green-100 text-green-700' },
      neutre: { icon: Minus, label: 'Neutre', variant: 'secondary' as const, className: '' },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', variant: 'destructive' as const, className: '' }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={cn("gap-1 text-xs", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

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
          <div className="space-y-4">
            {allItems.map((item, idx) => {
              const isEvent = item.type === 'event';
              const data = item.data;
              const eventDate = new Date(isEvent ? data.event_date : data.date_visite);

              if (!isEvent) {
                // Render visite with full details
                const isEffectuee = data.statut === 'effectuee' || data.offres?.statut === 'visite_effectuee';
                const showPostVisitActions = isEffectuee && 
                  data.offres?.statut !== 'interesse' && 
                  data.offres?.statut !== 'refusee' && 
                  data.offres?.statut !== 'candidature_deposee';

                return (
                  <div
                    key={`visite-${data.id}-${idx}`}
                    className="p-4 rounded-lg border bg-card space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{data.adresse}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="default" className="text-xs">
                            {data.statut === 'planifiee' ? 'Visite planifiée' : 'Visite effectuée'}
                          </Badge>
                          {data.est_deleguee && (
                            <Badge variant="outline" className="text-xs">Déléguée</Badge>
                          )}
                          {data.recommandation_agent && getRecommandationBadge(data.recommandation_agent)}
                        </div>
                      </div>
                      {data.offres && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {data.offres.prix?.toLocaleString('fr-CH')} CHF
                          </p>
                          <p className="text-xs text-muted-foreground">par mois</p>
                        </div>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-medium">
                            {format(eventDate, "EEEE d MMMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(eventDate, 'HH:mm')}
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
                            <p className="font-medium">{data.offres.pieces}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Maximize className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Surface</p>
                            <p className="font-medium">{data.offres.surface} m²</p>
                          </div>
                        </div>
                        {data.offres.etage && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Étage</p>
                              <p className="font-medium">{data.offres.etage}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Practical info */}
                    {data.offres && (data.offres.code_immeuble || data.offres.concierge_nom) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">📋 Informations pratiques</p>
                        <div className="grid grid-cols-1 gap-2">
                          {data.offres.code_immeuble && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                              <KeyRound className="w-4 h-4 text-primary" />
                              <span className="text-muted-foreground">Code:</span>
                              <span className="font-mono font-bold">{data.offres.code_immeuble}</span>
                            </div>
                          )}
                          {data.offres.concierge_nom && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
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
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium mb-1">📝 Feedback de l'agent:</p>
                        <p className="text-sm">{data.feedback_agent}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {data.notes && (
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                        💡 {data.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t">
                      {data.statut === 'planifiee' && data.offres?.statut !== 'visite_effectuee' && (
                        <Button 
                          onClick={() => onMarquerEffectuee(data)}
                          className="w-full"
                          size="sm"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Marquer comme effectuée
                        </Button>
                      )}

                      {showPostVisitActions && (
                        <div className="p-3 bg-muted rounded-lg space-y-2">
                          <p className="text-xs font-medium text-center">
                            Suite à cette visite, souhaitez-vous donner suite ?
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => onAccepterOffre(data)}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Intéressé
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={onVoirOffre}
                            >
                              <FileCheck className="mr-1 h-3 w-3" />
                              Candidature
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
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
                          className="flex-1"
                        >
                          Voir l'offre
                        </Button>
                        {data.offres?.lien_annonce && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(data.offres.lien_annonce, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
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
                  className={cn('p-3 rounded-lg border', eventTypeColors[item.eventType])}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {eventTypeLabels[item.eventType] || 'Événement'}
                    </Badge>
                  </div>
                  <h4 className="font-medium mt-1">{data.title}</h4>
                  {!data.all_day && (
                    <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(eventDate, 'HH:mm')}
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
