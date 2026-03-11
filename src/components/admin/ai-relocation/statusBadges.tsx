import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusConfig = {
  label: string;
  className: string;
};

// Mission status
const missionStatusMap: Record<string, StatusConfig> = {
  en_attente: { label: 'En attente', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-primary/10 text-primary border-primary/30' },
  en_pause: { label: 'En pause', className: 'bg-warning/10 text-warning border-warning/30' },
  terminee: { label: 'Terminée', className: 'bg-success/10 text-success border-success/30' },
  suspendue: { label: 'Suspendue', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  erreur: { label: 'Erreur', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

// Execution run status
const executionRunStatusMap: Record<string, StatusConfig> = {
  running: { label: 'En cours', className: 'bg-primary/10 text-primary border-primary/30 animate-pulse' },
  completed: { label: 'Terminé', className: 'bg-success/10 text-success border-success/30' },
  failed: { label: 'Échoué', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

// Property result status
const resultStatusMap: Record<string, StatusConfig> = {
  nouveau: { label: 'Nouveau', className: 'bg-primary/10 text-primary border-primary/30' },
  retenu: { label: 'Retenu', className: 'bg-success/10 text-success border-success/30' },
  rejete: { label: 'Rejeté', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  envoye_au_client: { label: 'Envoyé', className: 'bg-accent text-accent-foreground' },
  candidature_preparee: { label: 'Candidature', className: 'bg-warning/10 text-warning border-warning/30' },
  visite_proposee: { label: 'Visite proposée', className: 'bg-primary/10 text-primary border-primary/30' },
  visite_demandee: { label: 'Visite demandée', className: 'bg-warning/10 text-warning border-warning/30' },
  visite_confirmee: { label: 'Visite confirmée', className: 'bg-success/10 text-success border-success/30' },
  archive: { label: 'Archivé', className: 'bg-muted text-muted-foreground' },
};

// Offer status
const offerStatusMap: Record<string, StatusConfig> = {
  brouillon: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  pret: { label: 'Prêt', className: 'bg-primary/10 text-primary border-primary/30' },
  en_attente_validation: { label: 'En validation', className: 'bg-warning/10 text-warning border-warning/30' },
  envoye: { label: 'Envoyé', className: 'bg-success/10 text-success border-success/30' },
  refuse: { label: 'Refusé', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  erreur: { label: 'Erreur', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

// Visit request status
const visitStatusMap: Record<string, StatusConfig> = {
  non_traite: { label: 'Non traité', className: 'bg-muted text-muted-foreground' },
  a_proposer: { label: 'À proposer', className: 'bg-primary/10 text-primary border-primary/30' },
  demande_prete: { label: 'Demande prête', className: 'bg-accent text-accent-foreground' },
  en_attente_validation: { label: 'En validation', className: 'bg-warning/10 text-warning border-warning/30' },
  demande_envoyee: { label: 'Envoyée', className: 'bg-primary/10 text-primary border-primary/30' },
  en_attente_reponse: { label: 'En attente', className: 'bg-warning/10 text-warning border-warning/30' },
  visite_confirmee: { label: 'Confirmée', className: 'bg-success/10 text-success border-success/30' },
  visite_refusee: { label: 'Refusée', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  visite_annulee: { label: 'Annulée', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  visite_a_effectuer: { label: 'À effectuer', className: 'bg-success/10 text-success border-success/30' },
};

// Approval status
const approvalStatusMap: Record<string, StatusConfig> = {
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning border-warning/30' },
  approved: { label: 'Approuvé', className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'Rejeté', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  modified: { label: 'Modifié', className: 'bg-accent text-accent-foreground' },
};

// Score label
const scoreLabelMap: Record<string, StatusConfig> = {
  excellent: { label: 'Excellent', className: 'bg-success/10 text-success border-success/30' },
  bon: { label: 'Bon', className: 'bg-primary/10 text-primary border-primary/30' },
  moyen: { label: 'Moyen', className: 'bg-warning/10 text-warning border-warning/30' },
  faible: { label: 'Faible', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const allMaps: Record<string, Record<string, StatusConfig>> = {
  mission: missionStatusMap,
  execution_run: executionRunStatusMap,
  result: resultStatusMap,
  offer: offerStatusMap,
  visit: visitStatusMap,
  approval: approvalStatusMap,
  score: scoreLabelMap,
};

interface StatusBadgeProps {
  type: keyof typeof allMaps;
  value: string | null | undefined;
  className?: string;
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;

  const map = allMaps[type];
  const config = map?.[value];

  if (!config) {
    return (
      <Badge variant="outline" className={cn('text-xs', className)}>
        {value}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-xs border', config.className, className)}>
      {config.label}
    </Badge>
  );
}
