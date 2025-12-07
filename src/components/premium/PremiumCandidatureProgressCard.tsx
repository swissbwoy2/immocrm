import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Home, Banknote, ChevronRight } from 'lucide-react';

interface Candidature {
  id: string;
  statut: string;
  offres?: {
    adresse?: string;
    prix?: number;
    pieces?: number;
    surface?: number;
  };
}

interface PremiumCandidatureProgressCardProps {
  candidature: Candidature;
  index?: number;
  onClick?: () => void;
  className?: string;
}

const getStatusInfo = (statut: string) => {
  switch (statut) {
    case 'en_attente': 
      return { 
        label: 'En attente', 
        emoji: '⏳',
        step: 1, 
        bgColor: 'from-slate-500/10 to-slate-600/5',
        borderColor: 'border-slate-300/50 dark:border-slate-700/50',
        textColor: 'text-slate-600 dark:text-slate-400', 
        progress: 10 
      };
    case 'acceptee': 
      return { 
        label: 'Acceptée', 
        emoji: '✅',
        step: 2, 
        bgColor: 'from-emerald-500/10 to-green-600/5',
        borderColor: 'border-emerald-300/50 dark:border-emerald-700/50',
        textColor: 'text-emerald-600 dark:text-emerald-400', 
        progress: 20 
      };
    case 'bail_conclu': 
      return { 
        label: 'Prêt à conclure', 
        emoji: '🎉',
        step: 3, 
        bgColor: 'from-emerald-500/10 to-teal-600/5',
        borderColor: 'border-emerald-300/50 dark:border-emerald-700/50',
        textColor: 'text-emerald-600 dark:text-emerald-400', 
        progress: 30 
      };
    case 'attente_bail': 
      return { 
        label: 'Attente bail', 
        emoji: '📄',
        step: 4, 
        bgColor: 'from-amber-500/10 to-orange-600/5',
        borderColor: 'border-amber-300/50 dark:border-amber-700/50',
        textColor: 'text-amber-600 dark:text-amber-400', 
        progress: 40 
      };
    case 'bail_recu': 
      return { 
        label: 'Bail reçu', 
        emoji: '📋',
        step: 5, 
        bgColor: 'from-blue-500/10 to-indigo-600/5',
        borderColor: 'border-blue-300/50 dark:border-blue-700/50',
        textColor: 'text-blue-600 dark:text-blue-400', 
        progress: 50 
      };
    case 'signature_planifiee': 
      return { 
        label: 'Signature planifiée', 
        emoji: '📝',
        step: 6, 
        bgColor: 'from-violet-500/10 to-purple-600/5',
        borderColor: 'border-violet-300/50 dark:border-violet-700/50',
        textColor: 'text-violet-600 dark:text-violet-400', 
        progress: 60 
      };
    case 'signature_effectuee': 
      return { 
        label: 'Signature effectuée', 
        emoji: '🖊️',
        step: 7, 
        bgColor: 'from-indigo-500/10 to-blue-600/5',
        borderColor: 'border-indigo-300/50 dark:border-indigo-700/50',
        textColor: 'text-indigo-600 dark:text-indigo-400', 
        progress: 70 
      };
    case 'etat_lieux_fixe': 
      return { 
        label: 'État des lieux fixé', 
        emoji: '🏠',
        step: 8, 
        bgColor: 'from-cyan-500/10 to-teal-600/5',
        borderColor: 'border-cyan-300/50 dark:border-cyan-700/50',
        textColor: 'text-cyan-600 dark:text-cyan-400', 
        progress: 85 
      };
    case 'cles_remises': 
      return { 
        label: 'Clés remises', 
        emoji: '🔑',
        step: 9, 
        bgColor: 'from-teal-500/10 to-emerald-600/5',
        borderColor: 'border-teal-300/50 dark:border-teal-700/50',
        textColor: 'text-teal-600 dark:text-teal-400', 
        progress: 100 
      };
    default: 
      return { 
        label: statut, 
        emoji: '📋',
        step: 0, 
        bgColor: 'from-slate-500/10 to-slate-600/5',
        borderColor: 'border-slate-300/50',
        textColor: 'text-slate-600', 
        progress: 0 
      };
  }
};

export function PremiumCandidatureProgressCard({ 
  candidature, 
  index = 0, 
  onClick,
  className 
}: PremiumCandidatureProgressCardProps) {
  const statusInfo = getStatusInfo(candidature.statut);
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl border-2 cursor-pointer',
        'bg-gradient-to-br backdrop-blur-sm',
        statusInfo.bgColor,
        statusInfo.borderColor,
        'hover:scale-[1.01] hover:shadow-lg hover:border-primary/30',
        'transition-all duration-300 group/card',
        'animate-fade-in',
        className
      )}
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-700" />
      </div>
      
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <p className="font-semibold truncate group-hover/card:text-primary transition-colors">
                {candidature.offres?.adresse || 'Adresse non disponible'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {candidature.offres?.pieces && (
                <span className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  {candidature.offres.pieces} pcs
                </span>
              )}
              {candidature.offres?.prix && (
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" />
                  {candidature.offres.prix.toLocaleString('fr-CH')} CHF
                </span>
              )}
            </div>
          </div>
          <Badge 
            className={cn(
              'shrink-0 border-2 font-bold shadow-sm',
              statusInfo.textColor,
              'bg-background/50'
            )} 
            variant="outline"
          >
            {statusInfo.emoji} {statusInfo.label}
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progression du dossier</span>
            <span className={cn('font-bold', statusInfo.textColor)}>
              {statusInfo.progress}%
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden bg-background/50">
            <Progress 
              value={statusInfo.progress} 
              className="h-2"
              indicatorClassName="bg-gradient-to-r from-primary via-primary/80 to-accent shadow-lg shadow-primary/30"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className={cn('text-xs font-medium', statusInfo.textColor)}>
              Étape {statusInfo.step}/9
            </p>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/card:translate-x-1 group-hover/card:text-primary transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
