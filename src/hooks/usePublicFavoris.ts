import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Favoris du portail public d'annonces.
 * Charge une seule fois la liste des favoris de l'utilisateur connecté
 * et expose un helper de bascule.
 */
export function usePublicFavoris() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoris = [] } = useQuery({
    queryKey: ['favoris-annonces', user?.id],
    queryFn: async () => {
      if (!user) return [] as string[];
      const { data, error } = await supabase
        .from('favoris_annonces')
        .select('annonce_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((f: any) => f.annonce_id as string);
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFavorite = (annonceId: string) => favoris.includes(annonceId);

  const toggleFavorite = async (annonceId: string) => {
    if (!user) {
      toast.info('Connectez-vous pour enregistrer vos favoris');
      return;
    }

    const already = isFavorite(annonceId);
    try {
      if (already) {
        const { error } = await supabase
          .from('favoris_annonces')
          .delete()
          .eq('user_id', user.id)
          .eq('annonce_id', annonceId);
        if (error) throw error;
        toast.success('Retiré des favoris');
      } else {
        const { error } = await supabase
          .from('favoris_annonces')
          .insert({ user_id: user.id, annonce_id: annonceId });
        if (error) throw error;
        toast.success('Ajouté aux favoris');
      }
      queryClient.setQueryData(
        ['favoris-annonces', user.id],
        already ? favoris.filter((id) => id !== annonceId) : [...favoris, annonceId],
      );
    } catch {
      toast.error('Erreur lors de la mise à jour des favoris');
    }
  };

  return { favoris, isFavorite, toggleFavorite, isAuthenticated: !!user };
}
