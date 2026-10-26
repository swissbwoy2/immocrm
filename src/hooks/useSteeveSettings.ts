import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Steeve est-il actif pour cette conversation ? (réglage global steeve_enabled + client pilote).
 * Tant qu'il ne l'est pas, aucun élément lié à Steeve n'apparaît dans l'interface.
 */
export function useSteeveSettings(conversationId: string | null | undefined) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['steeve-settings', conversationId],
    enabled: !!user && !!conversationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_steeve_settings', { p_conversation_id: conversationId as string });
      if (error) return { enabled: false };
      const settings = (data ?? {}) as { enabled?: boolean };
      return { enabled: settings.enabled === true };
    },
  });
  return { enabled: data?.enabled === true };
}
