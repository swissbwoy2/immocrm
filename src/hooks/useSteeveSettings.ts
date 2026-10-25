import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Réglage global d'activation de Steeve (clé `steeve_enabled` de app_config, lue par RPC).
 * Tant qu'il est désactivé, aucun élément lié à Steeve n'apparaît dans l'interface.
 */
export function useSteeveSettings() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['steeve-settings'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_steeve_settings');
      if (error) return { enabled: false };
      const settings = (data ?? {}) as { enabled?: boolean };
      return { enabled: settings.enabled === true };
    },
  });
  return { enabled: data?.enabled === true };
}
