import { useState } from 'react';
import { CheckCircle, Circle, Clock, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WORKFLOW_STEPS = [
  { key: 'candidature_deposee', label: 'Demande reçue', description: 'En attente de l\'envoi par l\'agent' },
  { key: 'en_attente', label: 'Dossier envoyé', description: 'Dossier envoyé à la régie' },
  { key: 'acceptee', label: 'Acceptée', description: 'Candidature acceptée par la régie' },
  { key: 'bail_conclu', label: 'Client confirme', description: 'Vous confirmez vouloir le bail', clientAction: true },
  { key: 'attente_bail', label: 'Validation régie', description: 'Agent valide avec la régie' },
  { key: 'bail_recu', label: 'Bail reçu', description: 'Le bail est prêt à signer' },
  { key: 'signature_planifiee', label: 'Date choisie', description: 'Date de signature confirmée' },
  { key: 'signature_effectuee', label: 'Bail signé', description: 'Signature effectuée' },
  { key: 'etat_lieux_fixe', label: 'EDL fixé', description: 'État des lieux planifié' },
  { key: 'cles_remises', label: 'Clés remises', description: 'Emménagement terminé' },
];

const STEP_ORDER = WORKFLOW_STEPS.map(s => s.key);

// Steps that come before the workflow
const PRE_WORKFLOW_STATUTS = ['envoyee', 'vue', 'interesse', 'visite_planifiee'];

// Map visite_effectuee to candidature_deposee
const CANDIDATURE_DEPOSEE_STATUTS = ['visite_effectuee'];

interface CandidatureWorkflowInteractiveProps {
  currentStatut: string;
  candidature?: any;
  onProgressWorkflow?: (nextStatut: string, candidatureId: string) => Promise<void>;
  onChooseDate?: (candidatureId: string) => void;
}

export function CandidatureWorkflowInteractive({ 
  currentStatut, 
  candidature,
  onProgressWorkflow,
  onChooseDate 
}: CandidatureWorkflowInteractiveProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ nextStatut: string; label: string } | null>(null);

  const isRefused = currentStatut === 'refusee';
  const isPreWorkflow = PRE_WORKFLOW_STATUTS.includes(currentStatut);
  const isCandidatureDeposee = CANDIDATURE_DEPOSEE_STATUTS.includes(currentStatut);
  
  // Map statuses to workflow steps
  const effectiveStatut = isPreWorkflow ? 'candidature_deposee' : 
    isCandidatureDeposee ? 'candidature_deposee' : currentStatut;
  const currentIndex = STEP_ORDER.indexOf(effectiveStatut);
  
  // Calculate progress percentage
  const progressPercent = isRefused ? 0 : 
    currentIndex === -1 ? 0 : 
    Math.round(((currentIndex + 1) / WORKFLOW_STEPS.length) * 100);

  if (isRefused) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <Circle className="h-5 w-5 text-destructive fill-destructive" />
        <span className="text-sm font-medium text-destructive">Candidature refusée</span>
      </div>
    );
  }

  // Get the message for current status
  const getCurrentStatusMessage = () => {
    if (currentStatut === 'visite_effectuee') {
      return {
        title: "Visite effectuée",
        message: "Vous avez effectué la visite. Si vous souhaitez déposer votre dossier, votre agent s'en chargera.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'candidature_deposee') {
      return {
        title: "Demande de candidature reçue",
        message: "Votre agent vérifie votre dossier et l'enverra à la régie. Vous serez notifié dès que le dossier sera envoyé.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'en_attente') {
      return {
        title: "Dossier envoyé",
        message: "Votre dossier a été transmis à la régie. En attente de leur réponse.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'acceptee') {
      return {
        title: "🎉 Candidature acceptée !",
        message: "Félicitations ! Vous pouvez maintenant confirmer pour conclure le bail.",
        type: "action" as const,
        action: { nextStatut: 'bail_conclu', label: 'Conclure le bail' }
      };
    }
    if (currentStatut === 'bail_conclu') {
      return {
        title: "Confirmation enregistrée",
        message: "Votre agent valide avec la régie. Vous serez notifié dès réception du bail.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'attente_bail') {
      return {
        title: "Validation en cours",
        message: "En attente de la réception du bail par la régie...",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'bail_recu') {
      return {
        title: "Bail reçu !",
        message: "Le bail est prêt. Choisissez une date de signature.",
        type: "date_action" as const
      };
    }
    if (currentStatut === 'signature_planifiee') {
      return {
        title: "Signature planifiée",
        message: candidature?.date_signature_choisie 
          ? `Rendez-vous le ${new Date(candidature.date_signature_choisie).toLocaleDateString('fr-FR')} à ${candidature.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}`
          : "Date de signature confirmée.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'signature_effectuee') {
      return {
        title: "✅ Bail signé !",
        message: "En attente de la date de l'état des lieux...",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'etat_lieux_fixe') {
      return {
        title: "État des lieux planifié",
        message: candidature?.date_etat_lieux 
          ? `Prévu le ${new Date(candidature.date_etat_lieux).toLocaleDateString('fr-FR')}${candidature.heure_etat_lieux ? ` à ${candidature.heure_etat_lieux}` : ''}`
          : "La date de l'état des lieux est fixée.",
        type: "waiting" as const
      };
    }
    if (currentStatut === 'cles_remises') {
      return {
        title: "🔑 Clés remises !",
        message: "Félicitations ! Bienvenue dans votre nouveau logement !",
        type: "completed" as const
      };
    }
    return null;
  };

  const handleAction = async (nextStatut: string, label: string) => {
    setPendingAction({ nextStatut, label });
    setConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!pendingAction || !candidature || !onProgressWorkflow) return;
    
    setLoading(true);
    try {
      await onProgressWorkflow(pendingAction.nextStatut, candidature.id);
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  };

  const statusMessage = getCurrentStatusMessage();

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progression</span>
          <span>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Current status message */}
      {statusMessage && (
        <div className={cn(
          "p-4 rounded-lg border",
          statusMessage.type === 'waiting' && "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
          statusMessage.type === 'action' && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
          statusMessage.type === 'date_action' && "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
          statusMessage.type === 'completed' && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
        )}>
          <div className="flex items-start gap-3">
            {statusMessage.type === 'waiting' ? (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            ) : statusMessage.type === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <p className={cn(
                "font-semibold",
                statusMessage.type === 'waiting' && "text-amber-800 dark:text-amber-200",
                statusMessage.type === 'action' && "text-green-800 dark:text-green-200",
                statusMessage.type === 'date_action' && "text-blue-800 dark:text-blue-200",
                statusMessage.type === 'completed' && "text-green-800 dark:text-green-200"
              )}>
                {statusMessage.title}
              </p>
              <p className={cn(
                "text-sm",
                statusMessage.type === 'waiting' && "text-amber-700 dark:text-amber-300",
                statusMessage.type === 'action' && "text-green-700 dark:text-green-300",
                statusMessage.type === 'date_action' && "text-blue-700 dark:text-blue-300",
                statusMessage.type === 'completed' && "text-green-700 dark:text-green-300"
              )}>
                {statusMessage.message}
              </p>
              
              {/* Action button */}
              {statusMessage.type === 'action' && statusMessage.action && onProgressWorkflow && candidature && (
                <Button 
                  className="w-full mt-3"
                  onClick={() => handleAction(statusMessage.action!.nextStatut, statusMessage.action!.label)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  {statusMessage.action.label}
                </Button>
              )}
              
              {/* Date selection action */}
              {statusMessage.type === 'date_action' && onChooseDate && candidature && (
                <Button 
                  className="w-full mt-3"
                  onClick={() => onChooseDate(candidature.id)}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Choisir une date de signature
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal timeline - Desktop */}
      <div className="hidden sm:block overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[700px]">
          {WORKFLOW_STEPS.map((step, index) => {
            const isPast = index < currentIndex || (currentIndex === -1 && !isPreWorkflow);
            const isCurrent = index === currentIndex || (isPreWorkflow && index === 0 && currentStatut === 'candidature_deposee');
            const isFuture = index > currentIndex;
            const isCurrentPreWorkflow = isPreWorkflow && index === 0;

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
                  (isCurrent || isCurrentPreWorkflow) && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && !isCurrentPreWorkflow && "bg-muted text-muted-foreground"
                )}>
                  {isPast ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (isCurrent || isCurrentPreWorkflow) ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                <span className={cn(
                  "text-[10px] mt-1.5 text-center leading-tight max-w-[60px]",
                  (isCurrent || isCurrentPreWorkflow) && "font-semibold text-primary",
                  isPast && "text-muted-foreground",
                  isFuture && !isCurrentPreWorkflow && "text-muted-foreground/60"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {WORKFLOW_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex || (isPreWorkflow && index === 0);
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

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.nextStatut === 'bail_conclu' && (
                <>
                  <p className="mb-3">
                    En acceptant de conclure ce bail, vous vous engagez à respecter les conditions suivantes :
                  </p>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 mb-3">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      ⚠️ Des frais pourront être facturés en cas de désistement par la régie ou le propriétaire 
                      de l'offre, en alignement avec leurs conditions générales.
                    </p>
                  </div>
                  <p>Êtes-vous sûr de vouloir continuer ?</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
