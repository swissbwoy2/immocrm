import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { loadClientDossierContext, type ClientDossierContext } from '@/lib/clientDossier';

/**
 * Dossier du client connecté (location ou achat, personnes rattachées).
 * null pour les autres rôles : la messagerie garde alors ses pièces jointes habituelles.
 */
export function useClientDossier(): ClientDossierContext | null {
  const { user, userRole } = useAuth();
  const enabled = !!user?.id && userRole === 'client';
  const { data } = useQuery({
    queryKey: ['client-dossier-context', user?.id],
    enabled,
    staleTime: 60 * 1000, // une personne ajoutée au dossier apparaît vite dans le choix
    queryFn: () => loadClientDossierContext(user!.id),
  });
  return enabled ? data ?? null : null;
}
