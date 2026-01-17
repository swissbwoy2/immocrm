import { CheckCircle2, Circle, Clock, FileText, Home, Users, Handshake, Scale, Key, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VenteWorkflowTimelineProps {
  currentStep: string;
  dossierComplet?: boolean;
  estimationValidee?: boolean;
  estPublie?: boolean;
  nbVisites?: number;
  nbOffres?: number;
  offreAcceptee?: boolean;
  notairePlanifie?: boolean;
  signatureEffectuee?: boolean;
  entreeFaite?: boolean;
}

interface Step {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STEPS: Step[] = [
  { id: 'dossier', label: 'Dossier', icon: FileText, description: 'Informations complètes' },
  { id: 'estimation', label: 'Estimation', icon: Home, description: 'Prix validé' },
  { id: 'publication', label: 'Publication', icon: Circle, description: 'En ligne' },
  { id: 'visites', label: 'Visites', icon: Users, description: 'En cours' },
  { id: 'offres', label: 'Offres', icon: Handshake, description: 'Réception' },
  { id: 'negociation', label: 'Négociation', icon: Clock, description: 'En cours' },
  { id: 'acceptation', label: 'Offre acceptée', icon: CheckCircle2, description: 'Accord trouvé' },
  { id: 'notaire', label: 'Notaire', icon: Scale, description: 'Rendez-vous fixé' },
  { id: 'signature', label: 'Signature', icon: FileText, description: 'Acte signé' },
  { id: 'entree', label: 'Entrée', icon: Key, description: 'Remise des clés' },
];

const getStepStatus = (step: Step, props: VenteWorkflowTimelineProps): 'completed' | 'active' | 'pending' => {
  const { 
    dossierComplet, estimationValidee, estPublie, nbVisites = 0, 
    nbOffres = 0, offreAcceptee, notairePlanifie, signatureEffectuee, entreeFaite 
  } = props;

  switch (step.id) {
    case 'dossier':
      return dossierComplet ? 'completed' : 'active';
    case 'estimation':
      if (!dossierComplet) return 'pending';
      return estimationValidee ? 'completed' : 'active';
    case 'publication':
      if (!estimationValidee) return 'pending';
      return estPublie ? 'completed' : 'active';
    case 'visites':
      if (!estPublie) return 'pending';
      return nbVisites > 0 ? 'completed' : 'active';
    case 'offres':
      if (!estPublie) return 'pending';
      return nbOffres > 0 ? 'completed' : 'active';
    case 'negociation':
      if (nbOffres === 0) return 'pending';
      return offreAcceptee ? 'completed' : 'active';
    case 'acceptation':
      if (!offreAcceptee) return 'pending';
      return 'completed';
    case 'notaire':
      if (!offreAcceptee) return 'pending';
      return notairePlanifie ? 'completed' : 'active';
    case 'signature':
      if (!notairePlanifie) return 'pending';
      return signatureEffectuee ? 'completed' : 'active';
    case 'entree':
      if (!signatureEffectuee) return 'pending';
      return entreeFaite ? 'completed' : 'active';
    default:
      return 'pending';
  }
};

export function VenteWorkflowTimeline(props: VenteWorkflowTimelineProps) {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-start justify-between min-w-[900px] px-4">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step, props);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative flex-1">
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5",
                    status === 'completed' ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
              
              {/* Icon circle */}
              <div 
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  status === 'completed' && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                  status === 'active' && "bg-primary/20 text-primary border-2 border-primary animate-pulse",
                  status === 'pending' && "bg-muted text-muted-foreground"
                )}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  "mt-2 text-xs font-medium text-center whitespace-nowrap",
                  status === 'completed' && "text-primary",
                  status === 'active' && "text-primary",
                  status === 'pending' && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              
              {/* Description */}
              <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
