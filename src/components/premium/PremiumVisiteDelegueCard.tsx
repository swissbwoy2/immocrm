import { Calendar, MapPin, Home, Square, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';

type CardVariant = 'pending' | 'confirmed' | 'refused';

interface PremiumVisiteDelegueCardProps {
  visite: {
    id: string;
    adresse: string;
    created_at: string;
    date_visite?: string;
    offres?: {
      pieces?: number;
      surface?: number;
      prix?: number;
    };
  };
  variant: CardVariant;
  index?: number;
  className?: string;
}

const variantConfig: Record<CardVariant, {
  badgeText: string;
  badgeClass: string;
  borderHover: string;
  message?: string;
  messageIcon?: React.ReactNode;
}> = {
  pending: {
    badgeText: 'En attente',
    badgeClass: 'bg-amber-100/80 text-amber-800 border-amber-300/50 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700/50',
    borderHover: 'hover:border-amber-400/60 dark:hover:border-amber-600/60',
    message: 'Votre agent va bientôt confirmer cette demande',
    messageIcon: <span className="animate-pulse">⏳</span>
  },
  confirmed: {
    badgeText: 'Confirmée',
    badgeClass: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0',
    borderHover: 'hover:border-blue-400/60 dark:hover:border-blue-600/60',
    message: 'Votre agent effectuera la visite et vous partagera son feedback',
    messageIcon: <Sparkles className="w-4 h-4 text-blue-500" />
  },
  refused: {
    badgeText: 'Non disponible',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
    borderHover: 'hover:border-slate-400/60 dark:hover:border-slate-600/60',
    message: "Votre agent n'était pas disponible pour cette visite"
  }
};

export function PremiumVisiteDelegueCard({
  visite,
  variant,
  index = 0,
  className
}: PremiumVisiteDelegueCardProps) {
  const config = variantConfig[variant];

  // Countdown for confirmed visits
  const getCountdown = () => {
    if (variant !== 'confirmed' || !visite.date_visite) return null;
    
    const visitDate = new Date(visite.date_visite);
    const now = new Date();
    const daysLeft = differenceInDays(visitDate, now);
    const hoursLeft = differenceInHours(visitDate, now);
    
    if (daysLeft > 0) {
      return { text: `Dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`, urgent: daysLeft <= 2 };
    } else if (hoursLeft > 0) {
      return { text: `Dans ${hoursLeft}h`, urgent: true };
    } else if (hoursLeft === 0) {
      return { text: "Aujourd'hui!", urgent: true };
    }
    return null;
  };

  const countdown = getCountdown();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-card/95 via-card/90 to-card/80',
        'backdrop-blur-sm',
        'border border-border/50',
        config.borderHover,
        'p-4 md:p-5',
        'transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5',
        'hover:-translate-y-0.5',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
      </div>

      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {visite.adresse}
              </h3>
            </div>
            
            {/* Date info */}
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-muted-foreground">
              {variant === 'confirmed' && visite.date_visite ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(visite.date_visite), 'EEEE d MMMM', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(visite.date_visite), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Demandée le {format(new Date(visite.created_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge 
            variant="outline" 
            className={cn(
              'shrink-0 font-medium',
              config.badgeClass
            )}
          >
            {config.badgeText}
          </Badge>
        </div>

        {/* Property specs */}
        {visite.offres && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {visite.offres.pieces && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-sm">
                <Home className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{visite.offres.pieces} pièces</span>
              </div>
            )}
            {visite.offres.surface && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-sm">
                <Square className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{visite.offres.surface} m²</span>
              </div>
            )}
            {visite.offres.prix && (
              <div className="text-primary font-semibold text-sm">
                CHF {visite.offres.prix.toLocaleString()}/mois
              </div>
            )}
          </div>
        )}

        {/* Countdown for confirmed */}
        {countdown && (
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-3',
            countdown.urgent 
              ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 animate-pulse' 
              : 'bg-blue-50/80 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          )}>
            <Clock className="w-4 h-4" />
            {countdown.text}
          </div>
        )}

        {/* Message */}
        {config.message && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {config.messageIcon}
            {config.message}
          </p>
        )}
      </div>
    </div>
  );
}
