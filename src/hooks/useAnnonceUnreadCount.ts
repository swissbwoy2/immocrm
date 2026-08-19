import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Nombre de messages non lus dans les conversations d'annonces de l'utilisateur.
 */
export function useAnnonceUnreadCount() {
  const { user } = useAuth();

  const { data = 0 } = useQuery({
    queryKey: ['annonce-unread-count', user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: convs, error } = await supabase
        .from('conversations_annonces')
        .select('id')
        .or(`participant_1_id.eq.${user!.id},participant_2_id.eq.${user!.id}`);
      if (error || !convs?.length) return 0;

      const { count } = await supabase
        .from('messages_annonces')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convs.map((c) => c.id))
        .eq('lu', false)
        .or(`expediteur_id.is.null,expediteur_id.neq.${user!.id}`);

      return count || 0;
    },
  });

  return data;
}
