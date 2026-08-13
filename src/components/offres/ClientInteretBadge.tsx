import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getInteretState } from '@/lib/offreInteret';

interface ClientInteretBadgeProps {
  statutOffre?: string | null;
  className?: string;
  /** Affiche "À confirmer / Confirmée" plutôt que "Intéressé / En attente" */
  variantShort?: boolean;
}

/**
 * Badge d'intérêt client dérivé de `offres.statut`.
 * Utilisé sur les fiches de visite (admin / agent / coursier).
 */
export function ClientInteretBadge({ statutOffre, className, variantShort }: ClientInteretBadgeProps) {
  const state = getInteretState(statutOffre);
  if (state.key === 'inconnu' && !statutOffre) return null;

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', state.className, className)}>
      {variantShort ? state.short : state.label}
    </Badge>
  );
}
