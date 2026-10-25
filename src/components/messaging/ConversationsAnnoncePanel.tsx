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
    <div className="grid min-h-[50vh] overflow-hidden rounded-2xl border border-border/70 bg-card md:grid-cols-[300px_1fr]">
      <ul className={cn('flex flex-col gap-0.5 overflow-y-auto p-2 md:border-r md:border-border/70', sel && 'hidden md:flex')}>
        {convs.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSel(c.id)} aria-current={sel === c.id ? 'true' : undefined} className={cn('w-full min-h-[60px] rounded-xl px-3 py-2.5 text-left text-sm transition-colors', sel === c.id ? 'bg-primary/10' : 'hover:bg-muted/60')}>
              <p className="truncate font-semibold text-foreground">{c.subject || 'Annonce'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {mode === 'annonceur' ? c.client_name : c.annonceur_user_id ? 'Bailleur / représentant' : 'Équipe Immo-Rama'}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <div className={cn('flex min-w-0 flex-col', !sel && 'hidden md:flex')}>
        {conv ? (
          <>
            <div className="flex min-h-[56px] items-center gap-2 border-b border-border/70 px-3 py-2">
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full md:hidden" onClick={() => setSel(null)} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Button>
              <p className="truncate text-[15px] font-semibold text-foreground">{conv.subject}</p>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
              {msgs.map((m) => (
                <div key={m.id} className={cn('w-fit max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.sender_id === userId ? 'ml-auto rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground')}>
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"><LinkifiedText text={m.content ?? ""} /></p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex items-end gap-2 border-t border-border/70 p-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message…" rows={1} className="min-h-[44px] flex-1 resize-none rounded-3xl border-transparent bg-muted/60 px-4 py-2.5 focus-visible:bg-background" />
              <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!text.trim() || sending} onClick={send} aria-label="Envoyer"><Send className="h-5 w-5" /></Button>
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
