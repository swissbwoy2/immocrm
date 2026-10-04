import { useEffect, useRef, useState } from 'react';
import { LinkifiedText } from './LinkifiedText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Chat lié à une annonce (table conversations, type 'annonce'), côté candidat ou annonceur. */
export function ConversationsAnnoncePanel({ userId, mode, initialId }: { userId: string; mode: 'candidat' | 'annonceur'; initialId?: string | null }) {
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(initialId ?? null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: convs = [] } = useQuery({
    queryKey: ['conv-annonce', mode, userId],
    queryFn: async () => {
      const col = mode === 'annonceur' ? 'annonceur_user_id' : 'client_id';
      const { data } = await (supabase as any).from('conversations').select('id, subject, client_name, annonce_id, annonceur_user_id, last_message_at, created_at')
        .eq('conversation_type', 'annonce').eq(col, userId).order('last_message_at', { ascending: false, nullsFirst: false });
      return (data ?? []) as any[];
    },
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['conv-annonce-msgs', sel],
    enabled: !!sel,
    queryFn: async () => {
      const { data } = await (supabase as any).from('messages').select('id, content, sender_id, created_at').eq('conversation_id', sel).order('created_at');
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (!sel) return;
    const ch = supabase.channel(`conv-annonce-${sel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${sel}` },
        () => qc.invalidateQueries({ queryKey: ['conv-annonce-msgs', sel] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sel, qc]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const content = text.trim();
    if (!sel || !content || sending) return;
    setSending(true);
    const { error } = await (supabase as any).from('messages').insert({ conversation_id: sel, sender_id: userId, sender_type: mode === 'annonceur' ? 'annonceur' : 'client', content });
    setSending(false);
    if (error) return toast.error(error.message);
    setText('');
    (supabase as any).from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', sel).then(() => {});
    qc.invalidateQueries({ queryKey: ['conv-annonce-msgs', sel] });
  };

  if (!convs.length) return null;
  const conv = convs.find((c) => c.id === sel);

  return (
    <div className="grid min-h-[50vh] overflow-hidden rounded-xl border md:grid-cols-[260px_1fr]">
      <ul className={cn('divide-y overflow-y-auto border-r', sel && 'hidden md:block')}>
        {convs.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSel(c.id)} className={cn('w-full p-3 text-left text-sm hover:bg-muted/50 min-h-[56px]', sel === c.id && 'bg-muted')}>
              <p className="truncate font-medium">{c.subject || 'Annonce'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {mode === 'annonceur' ? c.client_name : c.annonceur_user_id ? 'Bailleur / représentant' : 'Équipe Immo-Rama'}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <div className={cn('flex flex-col', !sel && 'hidden md:flex')}>
        {conv ? (
          <>
            <div className="flex items-center gap-2 border-b p-3">
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setSel(null)} aria-label="Retour"><ArrowLeft className="h-4 w-4" /></Button>
              <p className="truncate text-sm font-semibold">{conv.subject}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {msgs.map((m) => (
                <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.sender_id === userId ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                  <p className="whitespace-pre-wrap"><LinkifiedText text={m.content ?? ""} /></p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 border-t p-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message…" className="min-h-[44px] flex-1" />
              <Button size="icon" className="h-11 w-11" disabled={!text.trim() || sending} onClick={send} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <p className="m-auto p-6 text-sm text-muted-foreground">Sélectionnez une conversation</p>
        )}
      </div>
    </div>
  );
}

export async function ouvrirConversationAnnonce(annonceId: string): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc('ouvrir_conversation_annonce', { p_annonce_id: annonceId });
  if (error) { toast.error(error.message); return null; }
  return data as string;
}
