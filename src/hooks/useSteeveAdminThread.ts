import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SteeveThreadMsg = { id: string; role: 'user' | 'assistant'; content: string; tools?: string[]; created_at: string };

type Row = { id: string; sender_type: string | null; content: string | null; payload: unknown; created_at: string | null; masque_messagerie?: boolean | null };

const HISTORY = 60;

const toMsg = (r: Row): SteeveThreadMsg | null => {
  const content = (r.content ?? '').trim();
  if (!content || r.masque_messagerie) return null;
  const outils = (r.payload as { outils?: unknown } | null)?.outils;
  return {
    id: r.id,
    role: r.sender_type === 'assistant' ? 'assistant' : 'user',
    content,
    tools: Array.isArray(outils) ? outils.map(String) : undefined,
    created_at: r.created_at ?? '',
  };
};

/**
 * Conversation unique de l'admin avec Steeve : la même que dans la messagerie (type « steeve-admin »),
 * partagée par la bulle, la page Steeve et la messagerie. Historique en base, mises à jour en temps réel ;
 * un message envoyé ici réveille Steeve (fonction steeve-admin), qui répond dans ce même fil.
 */
export function useSteeveAdminThread(enabled: boolean) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SteeveThreadMsg[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const markRead = useCallback(async (convId: string) => {
    await supabase.from('messages').update({ read: true }).eq('conversation_id', convId).eq('sender_type', 'assistant').eq('read', false);
  }, []);

  const load = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_type, content, payload, created_at, masque_messagerie')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(HISTORY);
    if (!mounted.current) return;
    const rows = ((data ?? []) as Row[]).reverse();
    setMessages(rows.map(toMsg).filter((m): m is SteeveThreadMsg => !!m));
    void markRead(convId);
  }, [markRead]);

  // Conversation de l'admin connecté (créée au besoin), puis son historique.
  useEffect(() => {
    if (!enabled || !user?.id) return;
    let active = true;
    setLoading(true);
    (supabase.rpc as unknown as (fn: string) => PromiseLike<{ data: unknown; error: unknown }>)('steeve_admin_conversation')
      .then(async ({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError || typeof data !== 'string') { setError("Je n'arrive pas à ouvrir notre conversation."); setLoading(false); return; }
        setConversationId(data);
        await load(data);
        if (active) setLoading(false);
      }, () => { if (active) { setError("Je n'arrive pas à ouvrir notre conversation."); setLoading(false); } });
    return () => { active = false; };
  }, [enabled, user?.id, load]);

  // Temps réel : messages écrits ailleurs (messagerie, autre appareil) et réponses de Steeve.
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`steeve-admin-thread-${conversationId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = toMsg(payload.new as Row);
        if (!m) return;
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        if (m.role === 'assistant') void markRead(conversationId);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, markRead]);

  const send = useCallback(async (text: string) => {
    const content = text.trim().slice(0, 2000);
    if (!content || !conversationId || !user?.id || busy) return false;
    setError(null);
    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, sender_type: 'admin', content })
      .select('id, sender_type, content, payload, created_at')
      .single();
    if (insertError) { setError("Ton message n'est pas parti. Réessaie."); return false; }
    const mine = toMsg(inserted as Row);
    if (mine) setMessages((prev) => (prev.some((p) => p.id === mine.id) ? prev : [...prev, mine]));
    void supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    setBusy(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('steeve-admin', { body: { conversation_id: conversationId } });
      if (fnError) throw fnError;
      // Filet de sécurité si le temps réel a manqué la réponse.
      await load(conversationId);
    } catch {
      if (mounted.current) setError("Je n'arrive pas à répondre pour le moment. Réessaie dans un instant.");
    } finally {
      if (mounted.current) setBusy(false);
    }
    return true;
  }, [conversationId, user?.id, busy, load]);

  return { conversationId, messages, loading, busy, error, send };
}
