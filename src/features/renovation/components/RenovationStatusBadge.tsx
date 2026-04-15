import { Badge } from '@/components/ui/badge';
import { RenovationProjectStatus } from '../types/renovation';

const statusConfig: Record<RenovationProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  planning: { label: 'Planification', variant: 'outline' },
  quoting: { label: 'Devis en cours', variant: 'outline' },
  approved: { label: 'Approuvé', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'default' },
  on_hold: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
  archived: { label: 'Archivé', variant: 'secondary' },
  closed: { label: 'Clôturé', variant: 'default' },
};

interface Props {
  status: RenovationProjectStatus;
}

export function RenovationStatusBadge({ status }: Props) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
