import { Calendar, MapPin, Home, Square, ThumbsUp, ThumbsDown, Minus, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

type Recommandation = 'recommande' | 'neutre' | 'deconseille';

interface PremiumFeedbackCardProps {
  visite: {
    id: string;
    adresse: string;
    updated_at: string;
    recommandation_agent?: string | null;
    feedback_agent?: string | null;
    offres?: {
      pieces?: number;
      surface?: number;
      prix?: number;
    };
  };
  index?: number;
  className?: string;
}

const recommandationConfig: Record<Recommandation, {
  icon: typeof ThumbsUp;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  recommande: {
    icon: ThumbsUp,
    label: 'Recommandé par votre agent',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-50/50 dark:from-emerald-950/50 dark:to-green-900/30',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/40'
  },
  neutre: {
    icon: Minus,
    label: 'Avis neutre',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-50/50 dark:from-slate-950/50 dark:to-gray-900/30',
    borderColor: 'border-slate-200/60 dark:border-slate-800/40'
  },
  deconseille: {
    icon: ThumbsDown,
    label: 'Non recommandé',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50/50 dark:from-red-950/50 dark:to-rose-900/30',
    borderColor: 'border-red-200/60 dark:border-red-800/40'
  }
};

export function PremiumFeedbackCard({
  visite,
  index = 0,
  className
}: PremiumFeedbackCardProps) {
  const navigate = useNavigate();
  const recommandation = visite.recommandation_agent as Recommandation | null;
  const config = recommandation ? recommandationConfig[recommandation] : null;
  const Icon = config?.icon;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-card/95 via-card/90 to-card/80',
        'backdrop-blur-sm',
        'border border-emerald-200/50 dark:border-emerald-800/30',
        'hover:border-emerald-300/70 dark:hover:border-emerald-700/50',
        'p-5 md:p-6',
        'transition-all duration-300',
        'hover:shadow-lg hover:shadow-emerald-500/10',
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

      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl opacity-50" />

      {/* Content */}
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <h3 className="font-semibold text-foreground">
                {visite.adresse}
              </h3>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Visitée le {format(new Date(visite.updated_at), 'd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          <Badge className="shrink-0 bg-gradient-to-r from-emerald-600 to-green-500 text-white border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Effectuée
          </Badge>
        </div>

        {/* Property specs */}
        {visite.offres && (
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border/50">
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

        {/* Recommandation */}
        {config && Icon && (
          <div className={cn(
            'p-4 rounded-xl border',
            config.bgColor,
            config.borderColor
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                'bg-white/60 dark:bg-black/20',
                'shadow-sm'
              )}>
                <Icon className={cn('w-5 h-5', config.color)} />
              </div>
              <span className={cn('font-semibold', config.color)}>
                {config.label}
              </span>
            </div>
          </div>
        )}

        {/* Feedback */}
        {visite.feedback_agent && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Feedback de votre agent</span>
            </div>
            <div className={cn(
              'p-4 rounded-xl',
              'bg-gradient-to-br from-muted/50 to-muted/30',
              'border border-border/30',
              'relative overflow-hidden'
            )}>
              {/* Quote decoration */}
              <div className="absolute top-2 left-3 text-4xl text-primary/10 font-serif leading-none">
                "
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-line pl-6">
                {visite.feedback_agent}
              </p>
            </div>
          </div>
        )}

        {/* Action button */}
        {visite.offres && (
          <Button 
            variant="outline" 
            className={cn(
              'w-full group/btn relative overflow-hidden',
              'bg-gradient-to-r from-transparent to-transparent',
              'hover:from-primary/5 hover:to-primary/10',
              'border-primary/30 hover:border-primary/50',
              'transition-all duration-300'
            )}
            onClick={() => navigate('/client/offres-recues')}
          >
            <span className="relative z-10 flex items-center gap-2">
              Voir l'offre complète
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
