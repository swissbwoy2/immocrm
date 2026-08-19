import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConnectedIdentity {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
}

/** Chemin de l'espace correspondant au rôle de l'utilisateur connecté. */
export function getRoleSpacePath(role: string | null | undefined): string {
  if (!role) return '/espace-annonceur';
  if (role === 'annonceur') return '/espace-annonceur';
  if (role === 'proprietaire') return '/proprietaire';
  return `/${role}`;
}

/**
 * Identité de l'utilisateur connecté (profil + fiche client si existante),
 * utilisée pour pré-remplir le profil annonceur sans ressaisie.
 */
export function useConnectedIdentity() {
  const { user, userRole, loading } = useAuth();

  const query = useQuery({
    queryKey: ['connected-identity', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ConnectedIdentity> => {
      const [{ data: profile }, { data: client }] = await Promise.all([
        supabase
          .from('profiles')
          .select('prenom, nom, email, telephone')
          .eq('id', user!.id)
          .maybeSingle(),
        supabase
          .from('clients')
          .select('adresse')
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);

      return {
        prenom: profile?.prenom || '',
        nom: profile?.nom || '',
        email: profile?.email || user!.email || '',
        telephone: profile?.telephone || '',
        adresse: client?.adresse || '',
      };
    },
  });

  return {
    user,
    userRole,
    isAuthenticated: !!user,
    spacePath: getRoleSpacePath(userRole),
    identity: query.data,
    isLoading: loading || query.isLoading,
  };
}
