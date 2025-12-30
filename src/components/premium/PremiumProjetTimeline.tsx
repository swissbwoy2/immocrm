import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileSearch,
  FileCheck,
  ClipboardList,
  FileText,
  Building2,
  Send,
  Hourglass,
  CheckCheck,
  XCircle,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumProjetTimelineProps {
  currentStatut: string;
  className?: string;
}

const timelineSteps = [
  { 
    key: 'demande_recue', 
    label: 'Demande reçue', 
    icon: FileSearch,
    description: 'Votre demande a été soumise'
  },
  { 
    key: 'analyse_en_cours', 
    label: 'Analyse en cours', 
    icon: Clock,
    description: 'Notre équipe étudie votre projet'
  },
  { 
    key: 'etude_faisabilite_rendue', 
    label: 'Étude de faisabilité', 
    icon: FileCheck,
    description: 'Résultats de l\'étude disponibles'
  },
  { 
    key: 'planification_permis', 
    label: 'Planification permis', 
    icon: ClipboardList,
    description: 'Préparation du dossier de permis'
  },
  { 
    key: 'devis_transmis', 
    label: 'Devis transmis', 
    icon: FileText,
    description: 'Budget prévisionnel disponible'
  },
  { 
    key: 'permis_en_preparation', 
    label: 'Permis en préparation', 
    icon: Building2,
    description: 'Dossier en cours de constitution'
  },
  { 
    key: 'permis_depose', 
    label: 'Permis déposé', 
    icon: Send,
    description: 'Demande envoyée aux autorités'
  },
  { 
    key: 'attente_reponse_cantonale', 
    label: 'Attente réponse', 
    icon: Hourglass,
    description: 'En attente de décision'
  },
  { 
    key: 'projet_valide', 
    label: 'Projet validé', 
    icon: CheckCheck,
    description: 'Permis accordé !'
  },
  { 
    key: 'termine', 
    label: 'Terminé', 
    icon: Flag,
    description: 'Projet clôturé'
  }
];

// Special case for refused
const refusedStep = { 
  key: 'projet_refuse', 
  label: 'Projet refusé', 
  icon: XCircle,
  description: 'Permis refusé'
};

export function PremiumProjetTimeline({ currentStatut, className }: PremiumProjetTimelineProps) {
  const currentIndex = timelineSteps.findIndex(step => step.key === currentStatut);
  const isRefused = currentStatut === 'projet_refuse';

  // If refused, show up to where it was refused
  const displaySteps = isRefused 
    ? [...timelineSteps.slice(0, Math.max(currentIndex, 3)), refusedStep]
    : timelineSteps;

  const getStepStatus = (index: number, stepKey: string) => {
    if (isRefused && stepKey === 'projet_refuse') return 'refused';
    if (currentIndex === -1) return index === 0 ? 'current' : 'upcoming';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={cn('relative', className)}>
      {/* Progress bar background */}
      <div className="absolute left-[19px] top-[30px] bottom-[30px] w-0.5 bg-border/50" />
      
      {/* Animated progress */}
      <motion.div 
        className="absolute left-[19px] top-[30px] w-0.5 bg-gradient-to-b from-primary to-primary/50"
        initial={{ height: 0 }}
        animate={{ 
          height: `${Math.min(((currentIndex + 1) / displaySteps.length) * 100, 100)}%` 
        }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      <div className="space-y-1">
        {displaySteps.map((step, index) => {
          const status = getStepStatus(index, step.key);
          const StepIcon = step.icon;
          
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={cn(
                'relative flex items-start gap-4 p-3 rounded-lg transition-all duration-200',
                status === 'current' && 'bg-primary/5',
                status === 'refused' && 'bg-destructive/5'
              )}
            >
              {/* Icon container */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                status === 'current' && 'bg-primary/10 border-primary text-primary animate-pulse',
                status === 'upcoming' && 'bg-muted border-border text-muted-foreground',
                status === 'refused' && 'bg-destructive border-destructive text-destructive-foreground'
              )}>
                {status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : status === 'refused' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <h4 className={cn(
                  'font-medium text-sm',
                  status === 'completed' && 'text-foreground',
                  status === 'current' && 'text-primary font-semibold',
                  status === 'upcoming' && 'text-muted-foreground',
                  status === 'refused' && 'text-destructive font-semibold'
                )}>
                  {step.label}
                </h4>
                <p className={cn(
                  'text-xs mt-0.5',
                  status === 'upcoming' ? 'text-muted-foreground/60' : 'text-muted-foreground'
                )}>
                  {step.description}
                </p>
              </div>

              {/* Status indicator */}
              {status === 'current' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  En cours
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
