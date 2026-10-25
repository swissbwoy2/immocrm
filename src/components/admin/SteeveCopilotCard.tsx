import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string; tools?: string[] };

const STORAGE_PREFIX = 'logisorama.steeve-copilote.';
const SUGGESTIONS = [
  'Quoi de neuf aujourd’hui ?',
  'Quelles activations dois-je encaisser ?',
  'Quels dossiers sont bloqués ?',
  'Comment vont les agents cette semaine ?',
];
const TOOL_LABEL: Record<string, string> = {
  kpi: 'chiffres clés',
  activations: 'activations',
  blocages: 'dossiers bloqués',
  agents: 'agents',
  client: 'fiche client',
};

/**
 * Steeve, copilote de l'admin (lecture seule) : il répond à partir des synthèses de la base
 * (chiffres clés, activations, blocages, agents, fiche client) et propose des actions, sans rien modifier.
 * Le fil reste dans l'onglet (sessionStorage, par compte) et disparaît à sa fermeture.
 */
export function SteeveCopilotCard() {
  const { user } = useAuth();
  const key = user ? `${STORAGE_PREFIX}${user.id}` : null;
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (!key) return [];
    try { return JSON.parse(sessionStorage.getItem(key) || '[]'); } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (key) {
      try { sessionStorage.setItem(key, JSON.stringify(messages.slice(-30))); } catch { /* stockage indisponible */ }
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, key]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 2000);
    if (!content || sending) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('steeve-admin', {
        body: { messages: next.slice(-12).map(({ role, content: c }) => ({ role, content: c })) },
      });
      if (error || !data?.reply) throw error ?? new Error('réponse vide');
      setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply), tools: Array.isArray(data.tools) ? data.tools : [] }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Je n'arrive pas à répondre pour le moment. Vérifie que la fonction steeve-admin est déployée et que la clé de l'API Anthropic est configurée." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Copilote</CardTitle>
          <CardDescription>
            Demande à Steeve l'état de l'activité. Il lit les chiffres et les dossiers, propose des priorités, et ne modifie rien.
          </CardDescription>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} aria-label="Nouvelle conversation" title="Nouvelle conversation">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={listRef} className="max-h-[420px] min-h-[120px] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm" aria-live="polite">
          {messages.length === 0 && !sending && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="min-h-[36px] rounded-full border border-primary/40 bg-background px-3 py-1 text-xs hover:bg-primary/10">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn('max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 leading-relaxed',
                m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-background')}>
                {m.content}
              </div>
              {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">Sources : {m.tools.map((t) => TOOL_LABEL[t] || t).join(', ')}</p>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Steeve consulte les données…</div>
          )}
        </div>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <textarea
            value={draft}
            rows={1}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
            placeholder="Ex. : où en est le dossier de Martin ?"
            aria-label="Question pour le copilote"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-base outline-none focus:border-primary sm:text-sm"
          />
          <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}
