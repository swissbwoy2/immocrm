import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LinkifiedText } from '@/components/messaging/LinkifiedText';
import { cn } from '@/lib/utils';

type ChatMessage = { role: 'user' | 'assistant'; content: string; sig?: string };

const GREETING =
  "Bonjour, je suis Steeve, l'assistant de Logisorama ! Une question sur la recherche d'un logement, l'achat, nos tarifs ou la garantie ? Je vous réponds tout de suite.";
const SUGGESTIONS = ['Combien coûte le service ?', 'Et si vous ne trouvez rien ?', 'Comment ça marche ?'];
const SESSION_KEY = 'logisorama.steeve-public.session';
const HISTORY_KEY = 'logisorama.steeve-public.history';
const MAX_CHARS = 1000;

function readStorage(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // stockage indisponible (navigation privée) : la conversation reste en mémoire
  }
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Identifiant de visite (aléatoire), renouvelé après 24 h. */
function sessionId(): string {
  try {
    const stored = JSON.parse(readStorage(() => localStorage, SESSION_KEY) || 'null');
    if (stored && /^[A-Za-z0-9-]{8,64}$/.test(stored.id) && Date.now() - Number(stored.at) < SESSION_TTL_MS) return stored.id;
  } catch {
    // ancienne forme ou valeur illisible : on en crée une nouvelle
  }
  const id = crypto.randomUUID();
  writeStorage(() => localStorage, SESSION_KEY, JSON.stringify({ id, at: Date.now() }));
  return id;
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = readStorage(() => sessionStorage, HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string').slice(-20)
      : [];
  } catch {
    return [];
  }
}

/**
 * Steeve sur le site public : bulle de discussion pour les visiteurs (informations publiées uniquement).
 * N'apparaît que si l'équipe l'a activé (app_config.steeve_public_enabled).
 */
export function SteevePublicChat({ hidden = false }: { hidden?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    supabase.rpc('get_steeve_public_settings').then(({ data }) => {
      if (active) setEnabled((data as { enabled?: boolean } | null)?.enabled === true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    writeStorage(() => sessionStorage, HISTORY_KEY, JSON.stringify(messages.slice(-20)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!enabled) return null;

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || sending) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setDraft('');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('steeve-public', {
        body: { session_id: sessionId(), messages: next.slice(-10) },
      });
      if ((data as { enabled?: boolean } | null)?.enabled === false) {
        setEnabled(false);
        return;
      }
      if (error || !data?.reply) throw error ?? new Error('réponse vide');
      setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply), sig: typeof data.sig === 'string' ? data.sig : undefined }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Désolé, je n'arrive pas à répondre pour le moment. Réessayez dans un instant, ou démarrez votre recherche ici : https://logisorama.ch/nouveau-mandat",
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      data-floating-widget
      className={cn(
        'fixed right-4 z-[60] flex flex-col items-end bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] lg:bottom-6 lg:right-6',
        hidden && 'pointer-events-none invisible',
      )}
    >
      {open && (
        <div
          role="dialog"
          aria-label="Discuter avec Steeve"
          className="mb-3 flex h-[min(520px,calc(100dvh-180px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-semibold leading-tight">Steeve</p>
              <p className="text-xs opacity-80">Assistant Logisorama · répond tout de suite</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/15"
              aria-label="Fermer la discussion"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 text-sm" aria-live="polite" aria-relevant="additions">
            {[{ role: 'assistant' as const, content: GREETING }, ...messages].map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 leading-relaxed',
                    m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
                  )}
                >
                  <LinkifiedText text={m.content} />
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Steeve écrit…
                </div>
              </div>
            )}
            {messages.length === 0 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-primary/40 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border p-2"
            onSubmit={(e) => { e.preventDefault(); void send(draft); }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={MAX_CHARS}
              rows={1}
              placeholder="Votre question…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); }
              }}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary sm:text-sm"
              aria-label="Votre question pour Steeve"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-[11px] leading-snug text-muted-foreground">
            Steeve répond à partir des informations publiées sur le site, avec l'aide d'un service d'IA (Anthropic).
            N'indiquez pas de données personnelles ici.{' '}
            <a href="/politique-confidentialite" className="underline underline-offset-2">Confidentialité</a>
          </p>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.03]"
        aria-expanded={open}
        aria-label={open ? 'Fermer la discussion avec Steeve' : 'Discuter avec Steeve'}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? 'Fermer' : 'Une question ?'}</span>
      </button>
    </div>
  );
}
