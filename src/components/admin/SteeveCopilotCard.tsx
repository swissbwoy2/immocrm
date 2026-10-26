import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { Button } from '@/components/ui/button';
import { useSteeveAdminThread } from '@/hooks/useSteeveAdminThread';
import { cn } from '@/lib/utils';

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
  web: 'recherche web',
  journal_steeve: 'journal de Steeve',
  lancer_tache: 'tâche confiée à Steeve',
};

/**
 * Steeve, copilote de l'admin : il répond à partir des synthèses de la base (chiffres clés, activations,
 * blocages, agents, fiche client) et agit avec ses outils. C'est la même conversation que la bulle et la
 * conversation « Steeve » de la messagerie (une seule, en base, qui suit partout).
 */
export function SteeveCopilotCard() {
  const thread = useSteeveAdminThread(true);
  const { messages, busy: sending } = thread;
  const asked = messages.some((m) => m.role === 'user');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending, thread.error]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 2000);
    if (!content || sending) return;
    setDraft('');
    const ok = await thread.send(content);
    if (!ok) setDraft(content);
  };

  return (
    <section aria-labelledby="steeve-copilote-title" className={cn(DASH_CARD, 'flex min-w-0 flex-col p-4 md:p-6')}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="steeve-copilote-title" className="text-base font-semibold leading-snug text-foreground md:text-[17px]">Copilote</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Demande à Steeve l'état de l'activité. C'est la même conversation que la bulle et la messagerie : il y pose aussi ses demandes à valider, tu réponds ici ou là-bas.
          </p>
        </div>
      </header>

      <div
        ref={listRef}
        className="mt-4 h-[min(56dvh,480px)] min-h-[220px] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-background/40 p-3 dark:bg-white/[0.03] md:mt-5 md:h-[min(60vh,560px)]"
        aria-live="polite"
        aria-label="Conversation avec le copilote"
      >
        {thread.loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement de la conversation…</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={cn('max-w-[88%] whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2.5 text-[15px] leading-relaxed sm:max-w-[80%]',
              m.role === 'user' ? 'imr-lg-tint rounded-br-md text-primary-foreground' : 'imr-lg-glass rounded-bl-md text-foreground')}>
              {m.content}
            </div>
            {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
              <p className="mt-1 px-1 text-[13px] text-muted-foreground">Sources : {m.tools.map((t) => TOOL_LABEL[t] || t).join(', ')}</p>
            )}
          </div>
        ))}
        {!asked && !sending && !thread.loading && (
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-sm text-muted-foreground">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="imr-lg-glass min-h-11 rounded-full px-4 py-2 text-left text-sm font-medium text-foreground active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Steeve s’en occupe…</div>
        )}
        {thread.error && !sending && (
          <div role="alert" className="imr-lg-glass max-w-[88%] rounded-[20px] rounded-bl-md px-3.5 py-2.5 text-[15px] text-muted-foreground">{thread.error}</div>
        )}
      </div>

      <form
        className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-3 flex items-end gap-2 rounded-b-[22px] bg-background/80 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:static md:mx-0 md:mb-0 md:rounded-none md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none"
        onSubmit={(e) => { e.preventDefault(); void send(draft); }}
      >
        <textarea
          value={draft}
          rows={1}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
          placeholder="Ex. : où en est Martin ?"
          aria-label="Question pour le copilote"
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-border/70 bg-background px-4 py-2.5 text-base outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !draft.trim() || !thread.conversationId} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
      </form>
    </section>
  );
}
