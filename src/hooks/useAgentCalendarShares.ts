import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AgentShareStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface AgentLite {
  id: string;
  user_id: string;
  prenom?: string | null;
  nom?: string | null;
}

export interface AgentCalendarShare {
  id: string;
  requester_agent_id: string;
  recipient_agent_id: string;
  status: AgentShareStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  requester?: AgentLite | null;
  recipient?: AgentLite | null;
}

export function useAgentCalendarShares() {
  const { user } = useAuth();
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [shares, setShares] = useState<AgentCalendarShare[]>([]);
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [loading, setLoading] = useState(true);

  const sharedAgentIds = shares
    .filter((s) => s.status === 'accepted')
    .map((s) => (s.requester_agent_id === myAgentId ? s.recipient_agent_id : s.requester_agent_id));

  const incoming = shares.filter((s) => s.status === 'pending' && s.recipient_agent_id === myAgentId);
  const outgoing = shares.filter((s) => s.status === 'pending' && s.requester_agent_id === myAgentId);
  const accepted = shares.filter((s) => s.status === 'accepted');

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agentData) {
        setMyAgentId(null);
        setShares([]);
        return;
      }
      setMyAgentId(agentData.id);

      // Load all other agents (to pick from)
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, user_id, profiles!agents_user_id_fkey(prenom, nom)');

      const allAgents: AgentLite[] = (agentsData || [])
        .filter((a: any) => a.id !== agentData.id)
        .map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          prenom: a.profiles?.prenom,
          nom: a.profiles?.nom,
        }));
      setAgents(allAgents);

      // Load shares involving me
      const { data: sharesData, error } = await supabase
        .from('agent_calendar_shares')
        .select('*')
        .or(`requester_agent_id.eq.${agentData.id},recipient_agent_id.eq.${agentData.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useAgentCalendarShares] load error:', error);
        setShares([]);
        return;
      }

      // Enrich with agent info
      const map = new Map(allAgents.map((a) => [a.id, a]));
      // Add self
      const { data: meProfile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', user.id)
        .maybeSingle();
      map.set(agentData.id, {
        id: agentData.id,
        user_id: user.id,
        prenom: meProfile?.prenom,
        nom: meProfile?.nom,
      });

      const enriched: AgentCalendarShare[] = (sharesData || []).map((s: any) => ({
        ...s,
        requester: map.get(s.requester_agent_id) || null,
        recipient: map.get(s.recipient_agent_id) || null,
      }));
      setShares(enriched);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime
  useEffect(() => {
    if (!myAgentId) return;
    const channelName = `agent_calendar_shares_${myAgentId}_${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_calendar_shares' },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAgentId]);

  const sendRequest = useCallback(
    async (recipientAgentId: string) => {
      if (!myAgentId) return;
      const { error } = await supabase.from('agent_calendar_shares').insert({
        requester_agent_id: myAgentId,
        recipient_agent_id: recipientAgentId,
        status: 'pending',
      });
      if (error) {
        if ((error as any).code === '23505') {
          toast.error('Un partage existe déjà avec cet agent');
        } else {
          toast.error('Impossible d\'envoyer la demande');
          console.error(error);
        }
        return;
      }
      toast.success('Demande de partage envoyée');
      await reload();
    },
    [myAgentId, reload]
  );

  const respond = useCallback(
    async (shareId: string, accept: boolean) => {
      const { error } = await supabase
        .from('agent_calendar_shares')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', shareId);
      if (error) {
        toast.error('Action impossible');
        console.error(error);
        return;
      }
      toast.success(accept ? 'Partage accepté' : 'Demande refusée');
      await reload();
    },
    [reload]
  );

  const revoke = useCallback(
    async (shareId: string) => {
      const { error } = await supabase
        .from('agent_calendar_shares')
        .delete()
        .eq('id', shareId);
      if (error) {
        toast.error('Impossible de révoquer');
        console.error(error);
        return;
      }
      toast.success('Partage révoqué');
      await reload();
    },
    [reload]
  );

  return {
    loading,
    myAgentId,
    shares,
    agents,
    sharedAgentIds,
    incoming,
    outgoing,
    accepted,
    sendRequest,
    respond,
    revoke,
    reload,
  };
}
