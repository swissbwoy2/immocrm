import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STAFF_ROLES = ['admin', 'agent', 'coursier', 'closeur', 'apporteur', 'automation_operator'];

/**
 * Accès à la fiche INTERNE complète d'une annonce « sourcée » (issue de `offres`).
 * - Visiteur public / non connecté : pas d'accès (on redirige vers le lien source).
 * - Client actif connecté ou staff : accès à la fiche interne complète.
 */
export function useSourcedListingAccess() {
  const { user, userRole, loading } = useAuth();

  const isStaff = !!userRole && STAFF_ROLES.includes(userRole);

  const { data: isActiveClient, isLoading: clientLoading } = useQuery({
    queryKey: ['sourced-access-client', user?.id],
    enabled: !!user?.id && userRole === 'client',
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, statut')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) return false;
      if (!data) return false;
      return !['inactif', 'archive', 'supprime'].includes((data.statut || '').toLowerCase());
    },
  });

  const isLoading = loading || (userRole === 'client' && clientLoading);

  return {
    isLoading,
    /** true = la fiche interne complète peut être affichée */
    canViewInternalListing: isStaff || isActiveClient === true,
  };
}
