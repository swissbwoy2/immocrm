import { Home, Maximize2, Banknote, MapPin, ChevronRight, Sparkles, CheckCircle2, XCircle, Clock, Eye, Heart, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PremiumOffreRecueCardProps {
  offre: {
    id: string;
    adresse: string;
    pieces?: number;
    surface?: number;
    prix?: number;
    statut: string;
    date_envoi: string;
  };
  index?: number;
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  step: number;
}> = {
  envoyee: {
    label: 'Envoyée',
    icon: Send,
    color: 'text-muted-foreground',
    bgGradient: 'from-muted/50 to-muted/30',
    step: 1
  },
  vue: {
    label: 'Vue',
    icon: Eye,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-blue-500/5',
    step: 2
  },
  interesse: {
    label: 'Intéressé',
    icon: Heart,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-purple-500/5',
    step: 3
  },
  visite_planifiee: {
    label: 'Visite planifiée',
    icon: Clock,
    color: 'text-amber-500',
    bgGradient: 'from-amber-500/10 to-amber-500/5',
    step: 4
  },
  visite_effectuee: {
    label: 'Visite effectuée',
    icon: CheckCircle2,
    color: 'text-indigo-500',
    bgGradient: 'from-indigo-500/10 to-indigo-500/5',
    step: 5
  },
  candidature_deposee: {
    label: 'Candidature déposée',
    icon: Send,
    color: 'text-cyan-500',
    bgGradient: 'from-cyan-500/10 to-cyan-500/5',
    step: 6
  },
  acceptee: {
    label: 'Acceptée',
    icon: CheckCircle2,
    color: 'text-success',
    bgGradient: 'from-success/10 to-success/5',
    step: 7
  },
  refusee: {
    label: 'Refusée',
    icon: XCircle,
    color: 'text-destructive',
    bgGradient: 'from-destructive/10 to-destructive/5',
    step: 0
  }
};

const TIMELINE_STEPS = [
  { key: 'envoyee', label: 'Envoi' },
  { key: 'vue', label: 'Vue' },
  { key: 'interesse', label: 'Intérêt' },
  { key: 'visite', label: 'Visite' },
  { key: 'candidature', label: 'Candidature' },
];

export function PremiumOffreRecueCard({ offre, index = 0, onClick, className }: PremiumOffreRecueCardProps) {
  const config = STATUS_CONFIG[offre.statut] || STATUS_CONFIG.envoyee;
  const StatusIcon = config.icon;
  const isNew = offre.statut === 'envoyee';
  const isAccepted = offre.statut === 'acceptee';
  const isRefused = offre.statut === 'refusee';
  
  // Calculate timeline progress
  const getCurrentStep = () => {
    if (isRefused) return 0;
    if (['visite_planifiee', 'visite_effectuee'].includes(offre.statut)) return 4;
    if (offre.statut === 'candidature_deposee' || isAccepted) return 5;
    return config.step;
  };
  
  const currentStep = getCurrentStep();
  
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl cursor-pointer",
        "bg-gradient-to-br",
        config.bgGradient,
        "border border-border/50 hover:border-primary/30",
        "hover:shadow-xl hover:shadow-primary/10",
        "transform hover:scale-[1.02] hover:-translate-y-0.5",
        "transition-all duration-500 ease-out",
        "animate-fade-in",
        className
      )}
      onClick={onClick}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Success glow for accepted */}
      {isAccepted && (
        <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/0 animate-pulse" />
      )}
      
      {/* New badge indicator */}
      {isNew && (
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            <Badge className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-bounce-subtle">
              <Sparkles className="w-3 h-3 mr-1" />
              Nouvelle
            </Badge>
            <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-50 animate-ping" />
          </div>
        </div>
      )}
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      {/* Content */}
      <div className="relative p-5">
        {/* Header with status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl transition-all duration-300 flex-shrink-0",
              "bg-gradient-to-br from-background/80 to-background/60",
              "group-hover:shadow-lg",
              isAccepted && "group-hover:shadow-success/20",
              isRefused && "group-hover:shadow-destructive/20",
              !isAccepted && !isRefused && "group-hover:shadow-primary/20"
            )}>
              <Home className={cn(
                "w-5 h-5 transition-all duration-300 group-hover:scale-110",
                config.color
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                  {offre.adresse}
                </p>
              </div>
              
              {/* Property details */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {offre.pieces && (
                  <span className="flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    {offre.pieces}p
                  </span>
                )}
                {offre.surface && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    {offre.surface}m²
                  </span>
                )}
                {offre.prix && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Banknote className="w-3 h-3" />
                    {offre.prix.toLocaleString('fr-CH')} CHF
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {!isNew && (
            <Badge className={cn(
              "ml-2 shadow-sm transition-all duration-300 flex-shrink-0",
              isAccepted && "bg-success/10 text-success border-success/30",
              isRefused && "bg-destructive/10 text-destructive border-destructive/30",
              !isAccepted && !isRefused && "bg-muted border-border"
            )}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )}
        </div>
        
        {/* Progress timeline */}
        {!isRefused && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep - 1;
                
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-3 h-3 rounded-full transition-all duration-500",
                      isCompleted || isCurrent
                        ? isAccepted 
                          ? "bg-success shadow-lg shadow-success/30" 
                          : "bg-primary shadow-lg shadow-primary/30"
                        : "bg-muted",
                      isCurrent && "ring-4 ring-primary/20 animate-pulse-soft"
                    )} />
                    <span className={cn(
                      "text-[10px] mt-1 font-medium transition-colors duration-300",
                      isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Progress bar */}
            <div className="relative h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out",
                  isAccepted ? "bg-gradient-to-r from-success to-emerald-400" : "bg-gradient-to-r from-primary to-accent"
                )}
                style={{ width: `${Math.max(0, (currentStep - 1) / (TIMELINE_STEPS.length - 1) * 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Envoyée le {format(new Date(offre.date_envoi), "dd MMM yyyy", { locale: fr })}
          </span>
          
          <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-medium">Voir détails</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
