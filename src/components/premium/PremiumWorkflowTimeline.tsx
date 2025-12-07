import { CheckCircle, Clock, Circle, XCircle } from "lucide-react";

const WORKFLOW_STEPS = [
  { key: 'envoyee', label: 'Envoyée' },
  { key: 'vue', label: 'Vue' },
  { key: 'interesse', label: 'Intéressé' },
  { key: 'visite_planifiee', label: 'Visite' },
  { key: 'visite_effectuee', label: 'Visitée' },
  { key: 'candidature_deposee', label: 'Déposée' },
  { key: 'en_attente', label: 'Attente' },
  { key: 'acceptee', label: 'Acceptée' },
  { key: 'bail_conclu', label: 'Conclu' },
  { key: 'attente_bail', label: 'Attente bail' },
  { key: 'bail_recu', label: 'Bail reçu' },
  { key: 'signature_planifiee', label: 'Signature' },
  { key: 'signature_effectuee', label: 'Signé' },
  { key: 'etat_lieux_fixe', label: 'État lieux' },
  { key: 'cles_remises', label: 'Clés' },
];

const STEP_ORDER = WORKFLOW_STEPS.map(s => s.key);

const STATUS_MAP: Record<string, string> = {
  'envoyee': 'envoyee',
  'vue': 'vue',
  'interesse': 'interesse',
};

interface PremiumWorkflowTimelineProps {
  currentStatut: string;
}

export function PremiumWorkflowTimeline({ currentStatut }: PremiumWorkflowTimelineProps) {
  if (currentStatut === 'refusee') {
    return (
      <div className="flex items-center justify-center p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive mr-2" />
        <span className="text-destructive font-medium">Candidature refusée</span>
      </div>
    );
  }

  const effectiveStatut = STATUS_MAP[currentStatut] || currentStatut;
  const currentIndex = STEP_ORDER.indexOf(effectiveStatut);
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / STEP_ORDER.length) * 100 : 0;

  // Only show relevant steps (around current step)
  const getVisibleSteps = () => {
    if (currentIndex <= 3) {
      return WORKFLOW_STEPS.slice(0, 7);
    }
    if (currentIndex >= STEP_ORDER.length - 3) {
      return WORKFLOW_STEPS.slice(-7);
    }
    return WORKFLOW_STEPS.slice(currentIndex - 3, currentIndex + 4);
  };

  const visibleSteps = getVisibleSteps();

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-emerald-500 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Animated shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Progression: {Math.round(progressPercent)}%
        </p>
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-1">
          {visibleSteps.map((step, index) => {
            const stepIndex = STEP_ORDER.indexOf(step.key);
            const isPast = stepIndex < currentIndex;
            const isCurrent = stepIndex === currentIndex;
            const isFuture = stepIndex > currentIndex;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center group">
                {/* Step indicator */}
                <div className="relative">
                  {/* Glow for current */}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-lg animate-pulse" />
                  )}
                  
                  <div className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isPast ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30' : ''}
                    ${isCurrent ? 'bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30 scale-110' : ''}
                    ${isFuture ? 'bg-muted/50 border-2 border-dashed border-muted-foreground/30' : ''}
                    group-hover:scale-110
                  `}>
                    {isPast && <CheckCircle className="h-5 w-5 text-white" />}
                    {isCurrent && <Clock className="h-5 w-5 text-white animate-pulse" />}
                    {isFuture && <Circle className="h-4 w-4 text-muted-foreground/50" />}
                  </div>
                </div>

                {/* Label */}
                <span className={`
                  mt-2 text-xs font-medium text-center transition-colors duration-300 max-w-[60px]
                  ${isPast ? 'text-emerald-600 dark:text-emerald-400' : ''}
                  ${isCurrent ? 'text-primary font-semibold' : ''}
                  ${isFuture ? 'text-muted-foreground/50' : ''}
                `}>
                  {step.label}
                </span>

                {/* Connector line */}
                {index < visibleSteps.length - 1 && (
                  <div className="absolute left-1/2 top-5 w-full h-0.5 -z-10">
                    <div className={`
                      h-full transition-all duration-500
                      ${stepIndex < currentIndex ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-muted/30'}
                    `} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden">
        <div className="space-y-3">
          {visibleSteps.slice(0, 5).map((step, index) => {
            const stepIndex = STEP_ORDER.indexOf(step.key);
            const isPast = stepIndex < currentIndex;
            const isCurrent = stepIndex === currentIndex;
            const isFuture = stepIndex > currentIndex;

            return (
              <div key={step.key} className="flex items-center gap-3">
                {/* Step indicator */}
                <div className={`
                  relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                  ${isPast ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-md' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-primary to-primary/80 shadow-md scale-110' : ''}
                  ${isFuture ? 'bg-muted/50 border border-dashed border-muted-foreground/30' : ''}
                `}>
                  {isPast && <CheckCircle className="h-4 w-4 text-white" />}
                  {isCurrent && <Clock className="h-4 w-4 text-white animate-pulse" />}
                  {isFuture && <Circle className="h-3 w-3 text-muted-foreground/50" />}
                  
                  {isCurrent && (
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse -z-10" />
                  )}
                </div>

                {/* Label */}
                <span className={`
                  text-sm font-medium transition-colors duration-300
                  ${isPast ? 'text-emerald-600 dark:text-emerald-400' : ''}
                  ${isCurrent ? 'text-primary font-semibold' : ''}
                  ${isFuture ? 'text-muted-foreground/50' : ''}
                `}>
                  {step.label}
                </span>

                {/* Vertical connector */}
                {index < 4 && (
                  <div className="absolute left-4 mt-8 w-0.5 h-3 -z-10">
                    <div className={`
                      w-full h-full
                      ${stepIndex < currentIndex ? 'bg-emerald-500' : 'bg-muted/30'}
                    `} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
