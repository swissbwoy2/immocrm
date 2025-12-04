import { CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKFLOW_STEPS = [
  { key: 'dossier_en_cours', label: 'Dossier en cours' },
  { key: 'en_attente', label: 'Dossier envoyé' },
  { key: 'acceptee', label: 'Acceptée' },
  { key: 'bail_conclu', label: 'Client confirme' },
  { key: 'attente_bail', label: 'Validation régie' },
  { key: 'bail_recu', label: 'Bail reçu' },
  { key: 'signature_planifiee', label: 'Date choisie' },
  { key: 'signature_effectuee', label: 'Bail signé' },
  { key: 'etat_lieux_fixe', label: 'EDL fixé' },
  { key: 'cles_remises', label: 'Clés remises' },
];

const STEP_ORDER = WORKFLOW_STEPS.map(s => s.key);

// Map pre-workflow statuses
const STATUS_MAP: Record<string, string> = {
  'visite_effectuee': 'dossier_en_cours',
  'candidature_deposee': 'dossier_en_cours',
};

interface CandidatureWorkflowTimelineProps {
  currentStatut: string;
}

export function CandidatureWorkflowTimeline({ currentStatut }: CandidatureWorkflowTimelineProps) {
  // Map status to workflow step
  const effectiveStatut = STATUS_MAP[currentStatut] || currentStatut;
  const currentIndex = STEP_ORDER.indexOf(effectiveStatut);
  const isRefused = currentStatut === 'refusee';

  if (isRefused) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <Circle className="h-5 w-5 text-destructive fill-destructive" />
        <span className="text-sm font-medium text-destructive">Candidature refusée</span>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Mobile: vertical layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {WORKFLOW_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                isPast && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                isFuture && "bg-muted text-muted-foreground"
              )}>
                {isPast ? (
                  <CheckCircle className="h-3 w-3" />
                ) : isCurrent ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <Circle className="h-2.5 w-2.5" />
                )}
              </div>
              <span className={cn(
                "text-xs",
                isCurrent && "font-semibold text-primary",
                isPast && "text-muted-foreground",
                isFuture && "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal layout */}
      <div className="hidden sm:flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center min-w-[70px] relative">
              {index > 0 && (
                <div 
                  className={cn(
                    "absolute top-3 right-1/2 w-full h-0.5 -z-10",
                    isPast ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isPast && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                isFuture && "bg-muted text-muted-foreground"
              )}>
                {isPast ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              <span className={cn(
                "text-[10px] mt-1.5 text-center leading-tight max-w-[60px]",
                isCurrent && "font-semibold text-primary",
                isPast && "text-muted-foreground",
                isFuture && "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
