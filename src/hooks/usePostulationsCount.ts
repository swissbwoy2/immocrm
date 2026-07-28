import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Lightweight polling hook to expose the number of "souhaite_postuler" offres
// visible to the current user (all for admin, own+co for agent).
export function usePostulationsCount(role: string | null | undefined) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || (role !== 'admin' && role !== 'agent')) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const fetchCount = async () => {
      try {
        if (role === 'admin') {
          const { count: c } = await supabase
            .from('offres')
            .select('id', { count: 'exact', head: true })
            .eq('statut', 'souhaite_postuler');
          if (!cancelled) setCount(c ?? 0);
          return;
        }
        // agent
        const { data: agentData } = await supabase
          .from('agents').select('id').eq('user_id', user.id).maybeSingle();
        if (!agentData) { if (!cancelled) setCount(0); return; }
        const [{ data: own }, { data: co }] = await Promise.all([
          supabase.from('clients').select('id').eq('agent_id', agentData.id),
          supabase.from('client_agents').select('client_id').eq('agent_id', agentData.id),
        ]);
        const ids = Array.from(new Set([
          ...(own ?? []).map((c: any) => c.id),
          ...(co ?? []).map((c: any) => c.client_id),
        ]));
        if (ids.length === 0) { if (!cancelled) setCount(0); return; }
        const { count: c } = await supabase
          .from('offres')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'souhaite_postuler')
          .in('client_id', ids);
        if (!cancelled) setCount(c ?? 0);
      } catch (err) {
        console.warn('[usePostulationsCount]', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    const channel = supabase
      .channel('postulations-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offres', filter: 'statut=eq.souhaite_postuler' }, () => fetchCount())
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, role]);

  return count;
}
