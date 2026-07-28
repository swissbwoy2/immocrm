import { supabase } from '@/integrations/supabase/client';

/**
 * Return the canonical (oldest) client-agent conversation for a client,
 * creating one if needed. Also ensures the client's current agent is a
 * participant of `conversation_agents` so that server-side notification
 * triggers reach them.
 *
 * All messages for a given client (offres, videos, comptes-rendus,
 * decisions...) MUST use this helper so they end up in the same thread.
 */
export async function getOrCreateClientConversation(
  clientId: string
): Promise<string | null> {
  if (!clientId) return null;
  try {
    // Fetch client's current agent (may be null)
    const { data: cliRow } = await supabase
      .from('clients')
      .select('agent_id')
      .eq('id', clientId)
      .maybeSingle();
    const currentAgentId = cliRow?.agent_id ?? null;

    // Oldest client-agent conversation = canonical thread
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('conversation_type', 'client-agent')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let convId: string | null = existing?.id ?? null;

    if (!convId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          conversation_type: 'client-agent',
          agent_id: currentAgentId,
          status: 'active',
        } as any)
        .select('id')
        .single();
      if (error) {
        console.warn('[getOrCreateClientConversation] insert failed', error);
        return null;
      }
      convId = created?.id ?? null;
    }

    // Ensure current agent is participant
    if (convId && currentAgentId) {
      try {
        await supabase
          .from('conversation_agents')
          .upsert(
            { conversation_id: convId, agent_id: currentAgentId },
            { onConflict: 'conversation_id,agent_id', ignoreDuplicates: true }
          );
      } catch (e) {
        console.warn('[getOrCreateClientConversation] agents upsert failed', e);
      }
    }

    return convId;
  } catch (err) {
    console.error('[getOrCreateClientConversation] fatal', err);
    return null;
  }
}
