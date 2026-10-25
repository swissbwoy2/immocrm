import { cn } from '@/lib/utils';
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
        pillCls: 'bg-muted text-muted-foreground',
        progress: 10 
      };
    case 'acceptee': 
      return { 
        label: 'Acceptée', 
        emoji: '✅',
        step: 2,
        pillCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        progress: 20 
      };
    case 'bail_conclu': 
      return { 
        label: 'Prêt à conclure', 
        emoji: '🎉',
        step: 3,
        pillCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        progress: 30 
      };
    case 'attente_bail': 
      return { 
        label: 'Attente bail', 
        emoji: '📄',
        step: 4,
        pillCls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        progress: 40 
      };
    case 'bail_recu': 
      return { 
        label: 'Bail reçu', 
        emoji: '📋',
        step: 5,
        pillCls: 'bg-primary/10 text-primary',
        progress: 50 
      };
    case 'signature_planifiee': 
      return { 
        label: 'Signature planifiée', 
        emoji: '📝',
        step: 6,
        pillCls: 'bg-primary/10 text-primary',
        progress: 60 
      };
    case 'signature_effectuee': 
      return { 
        label: 'Signature effectuée', 
        emoji: '🖊️',
        step: 7,
        pillCls: 'bg-primary/10 text-primary',
        progress: 70 
      };
    case 'etat_lieux_fixe': 
      return { 
        label: 'État des lieux fixé', 
        emoji: '🏠',
        step: 8,
        pillCls: 'bg-primary/10 text-primary',
        progress: 85 
      };
    case 'cles_remises': 
      return { 
        label: 'Clés remises', 
        emoji: '🔑',
        step: 9,
        pillCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        progress: 100 
      };
    default: 
      return { 
        label: statut, 
        emoji: '📋',
        step: 0,
        pillCls: 'bg-muted text-muted-foreground',
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
        'cursor-pointer rounded-xl border border-border/70 bg-card p-3 sm:p-4',
        'transition-colors duration-150 hover:bg-muted/40 active:scale-[0.99] group/card',
        className
      )}
      onClick={onClick}
      data-index={index}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold text-foreground">
              {candidature.offres?.adresse || 'Adresse non disponible'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {candidature.offres?.pieces && (
              <span className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                {candidature.offres.pieces} pcs
              </span>
            )}
            {candidature.offres?.prix && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                {candidature.offres.prix.toLocaleString('fr-CH')} CHF
              </span>
            )}
          </div>
        </div>
        <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none', statusInfo.pillCls)}>
          {statusInfo.label}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">Progression du dossier</span>
          <span className="font-semibold text-foreground">
            {statusInfo.progress}%
          </span>
        </div>
        <Progress 
          value={statusInfo.progress} 
          className="h-1.5 bg-muted"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Étape {statusInfo.step}/9
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover/card:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}
