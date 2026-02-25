import { differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { toSwissTime, formatSwissDate, formatSwissTime } from '@/lib/dateUtils';
import { 
  Calendar, Clock, Home, Maximize, User, Phone, KeyRound, 
  Check, X, FileCheck, ThumbsUp, ThumbsDown, Minus, Sparkles, Eye,
  Building, ExternalLink, ArrowRight
} from 'lucide-react';
import { AddressLink } from '@/components/AddressLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeLabels, eventTypeColors } from './types';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddToCalendarButton } from './AddToCalendarButton';

interface PremiumClientDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  visites: any[];
  onMarquerEffectuee: (visite: any) => void;
  onAccepterOffre: (visite: any) => void;
  onRefuserOffre: (visite: any) => void;
  onVoirOffre: () => void;
}

export function PremiumClientDayEvents({ 
  date, events, visites, 
  onMarquerEffectuee, onAccepterOffre, onRefuserOffre, onVoirOffre 
}: PremiumClientDayEventsProps) {
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
                <Calendar className="w-8 h-8 text-primary/60" />
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
      return { text: 'Passé', color: 'text-muted-foreground' };
    }
    
    if (isToday(swissDate)) {
      const hours = differenceInHours(swissDate, now);
      if (hours <= 0) return { text: 'Maintenant', color: 'text-green-500' };
      return { text: `Dans ${hours}h`, color: 'text-orange-500' };
    }
    
    if (isTomorrow(swissDate)) {
      return { text: 'Demain', color: 'text-blue-500' };
    }
    
    const days = differenceInDays(swissDate, now);
    if (days <= 7) {
      return { text: `Dans ${days} jour${days > 1 ? 's' : ''}`, color: 'text-primary' };
    }
    
    return { text: `Dans ${days} jours`, color: 'text-muted-foreground' };
  };

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { 
        icon: ThumbsUp, 
        label: 'Recommandé', 
        className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
      },
      neutre: { 
        icon: Minus, 
        label: 'Neutre', 
        className: 'bg-muted/50 text-muted-foreground border-border/50' 
      },
      deconseille: { 
        icon: ThumbsDown, 
        label: 'Déconseillé', 
        className: 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-600 dark:text-red-400 border-red-500/30' 
      }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("gap-1 text-xs border", config.className)}>
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
        className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30'
      };
    }
    
    return {
      label: 'Visite planifiée',
      icon: Calendar,
      className: 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30'
    };
  };

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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg capitalize">
                {formatSwissDate(date, 'EEEE d MMMM')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatSwissDate(date, 'yyyy')}
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

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {allItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative inline-block mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-muted-foreground/50" />
                </div>
              </div>
              <p className="text-muted-foreground font-medium">
                Aucun événement ce jour
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    data.offres?.statut !== 'candidature_deposee';

                  return (
                    <div
                      key={`visite-${data.id}-${idx}`}
                      className="group relative rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50 overflow-hidden animate-fade-in hover:border-primary/30 transition-all duration-300"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      
                      <div className="relative p-4 space-y-4">
                        {/* Header with address and price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <AddressLink 
                              address={data.adresse}
                              className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors"
                              showIcon={false}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className={cn("gap-1 text-xs border", statusConfig.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                              {data.est_deleguee && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                  Déléguée
                                </Badge>
                              )}
                              {data.recommandation_agent && getRecommandationBadge(data.recommandation_agent)}
                            </div>
                          </div>
                          {data.offres && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                {data.offres.prix?.toLocaleString('fr-CH')}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">CHF/mois</p>
                            </div>
                          )}
                        </div>

                        {/* Date & Time Card */}
                        <div className="relative p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden group/date">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/date:opacity-100 transition-opacity" />
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {formatSwissDate(eventDate, "EEEE d MMMM")}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatSwissTime(eventDate)}
                                </p>
                              </div>
                            </div>
                            <div className={cn("px-3 py-1 rounded-full text-xs font-bold", timeRemaining.color, "bg-current/10")}>
                              <span className={timeRemaining.color}>{timeRemaining.text}</span>
                            </div>
                          </div>
                        </div>

                        {/* Property details */}
                        {data.offres && (
                          <div className="grid grid-cols-3 gap-2">
                            {data.offres.pieces && (
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 text-center group/item hover:border-primary/30 transition-colors">
                                <Home className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Pièces</p>
                                <p className="font-bold text-sm">{data.offres.pieces}</p>
                              </div>
                            )}
                            {data.offres.surface && (
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 text-center group/item hover:border-primary/30 transition-colors">
                                <Maximize className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Surface</p>
                                <p className="font-bold text-sm">{data.offres.surface} m²</p>
                              </div>
                            )}
                            {data.offres.etage && (
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 text-center group/item hover:border-primary/30 transition-colors">
                                <Building className="w-4 h-4 mx-auto text-primary mb-1" />
                                <p className="text-xs text-muted-foreground">Étage</p>
                                <p className="font-bold text-sm">{data.offres.etage}</p>
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
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-muted/60 to-muted/30 border border-border/40">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Code immeuble</p>
                                    <p className="font-mono font-bold text-sm">{data.offres.code_immeuble}</p>
                                  </div>
                                </div>
                              )}
                              {data.offres.concierge_nom && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-muted/60 to-muted/30 border border-border/40">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
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
                          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                              📝 Feedback de l'agent
                            </p>
                            <p className="text-sm">{data.feedback_agent}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {data.notes && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
                            <p className="text-sm">💡 {data.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          {/* Add to calendar button */}
                          <AddToCalendarButton
                            event={{
                              title: `Visite - ${data.adresse}`,
                              description: data.offres ? `${data.offres.pieces}p • ${data.offres.surface}m² • ${data.offres.prix} CHF/mois` : undefined,
                              location: data.adresse,
                              startDate: new Date(data.date_visite),
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          />
                          {data.statut === 'planifiee' && data.offres?.statut !== 'visite_effectuee' && isVisiteDatePassed && (
                            <Button 
                              onClick={() => onMarquerEffectuee(data)}
                              className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg shadow-green-500/20"
                              size="sm"
                            >
                              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
                              <Check className="mr-2 h-4 w-4" />
                              Marquer comme effectuée
                            </Button>
                          )}
                          {data.statut === 'planifiee' && !isVisiteDatePassed && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                                ⏳ Actions disponibles après la visite
                              </p>
                            </div>
                          )}

                          {showPostVisitActions && (
                            <div className="p-3 rounded-lg bg-gradient-to-r from-muted/80 to-muted/40 border border-border/50 space-y-3">
                              <p className="text-xs font-semibold text-center text-muted-foreground">
                                Suite à cette visite, souhaitez-vous donner suite ?
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => onAccepterOffre(data)}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Oui
                                </Button>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={onVoirOffre}
                                  className="border-primary/30 hover:bg-primary/10"
                                >
                                  <FileCheck className="mr-1 h-3 w-3" />
                                  Candidater
                                </Button>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onRefuserOffre(data)}
                                  className="border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400"
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Non
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={onVoirOffre}
                              className="flex-1 group/btn border-border/50 hover:border-primary/50 hover:bg-primary/5"
                            >
                              <Eye className="mr-2 h-4 w-4 group-hover/btn:text-primary transition-colors" />
                              Voir l'offre
                              <ArrowRight className="ml-auto h-4 w-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
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
                    className={cn(
                      'p-4 rounded-xl border bg-gradient-to-br animate-fade-in',
                      eventTypeColors[item.eventType]
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-background/50">
                        {eventTypeLabels[item.eventType] || 'Événement'}
                      </Badge>
                    </div>
                    <h4 className="font-semibold mt-2">{data.title}</h4>
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