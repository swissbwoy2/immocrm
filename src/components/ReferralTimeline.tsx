import { Check, Clock, Send, CreditCard, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReferralTimelineProps {
  statut: string;
  dateCreation?: string;
  dateValidation?: string;
  dateConclusion?: string;
  datePaiement?: string;
  compact?: boolean;
}

const steps = [
  { key: 'soumis', label: 'Soumis', icon: Send },
  { key: 'valide', label: 'Validé', icon: Check },
  { key: 'conclu', label: 'Conclu', icon: Clock },
  { key: 'paye', label: 'Payé', icon: CreditCard },
];

const statusOrder: Record<string, number> = {
  'soumis': 0,
  'en_attente': 0,
  'valide': 1,
  'en_cours': 1,
  'conclu': 2,
  'paye': 3,
  'rejete': -1,
  'annule': -1,
};

export function ReferralTimeline({ 
  statut, 
  dateCreation, 
  dateValidation, 
  dateConclusion, 
  datePaiement,
  compact = false 
}: ReferralTimelineProps) {
  const currentStep = statusOrder[statut] ?? 0;
  const isRejected = statut === 'rejete' || statut === 'annule';

  const getDateForStep = (stepKey: string): string | undefined => {
    switch (stepKey) {
      case 'soumis':
        return dateCreation;
      case 'valide':
        return dateValidation;
      case 'conclu':
        return dateConclusion;
      case 'paye':
        return datePaiement;
      default:
        return undefined;
    }
  };

  const formatStepDate = (date: string | undefined): string | null => {
    if (!date) return null;
    try {
      return format(new Date(date), 'dd/MM', { locale: fr });
    } catch {
      return null;
    }
  };

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <Circle className="h-4 w-4 fill-destructive" />
        <span className="text-sm font-medium">{statut === 'annule' ? 'Annulé' : 'Rejeté'}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStep;
          const isCurrent = index === currentStep;
          return (
            <div
              key={step.key}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500",
                isCompleted 
                  ? isCurrent 
                    ? "bg-primary animate-pulse" 
                    : "bg-primary"
                  : "bg-muted"
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStep;
          const isCurrent = index === currentStep;
          const Icon = step.icon;
          const stepDate = getDateForStep(step.key);
          const formattedDate = formatStepDate(stepDate);

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted
                    ? isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/30 animate-pulse"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium transition-colors",
                  isCompleted ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {formattedDate && isCompleted && (
                <span className="text-[10px] text-muted-foreground">
                  {formattedDate}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
        <div 
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
