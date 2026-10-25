import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Loader2, RotateCcw, MapPin, ArrowRight, Heart } from 'lucide-react';
import { SteeveLauncher, type SteeveInvite } from '@/components/steeve/SteeveLauncher';
import { supabase } from '@/integrations/supabase/client';
import { LinkifiedText } from '@/components/messaging/LinkifiedText';
import { cn } from '@/lib/utils';

type OfferCard = {
  ref: string;
  source: 'portail' | 'equipe';
  titre: string;
  pieces?: number;
  surface?: number;
  prix?: number;
  charges?: number;
  ville?: string;
  npa?: string;
  disponibilite?: string;
  atouts?: string;
  lien?: string;
  photo?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  sig?: string;
  offers?: OfferCard[];
  /** Message affiché par la bulle elle-même (relance), jamais envoyé au serveur. */
  local?: boolean;
  /** Heure d'arrivée (ms) : les relances ne concernent que la visite en cours. */
  at?: number;
};

const GREETING =
  "Salut, moi c'est Steeve, l'assistant de Logisorama ! Tu cherches quoi ? Dis-moi par exemple « 2.5 pièces à Lausanne avec vue sur le lac, 2500.- max » et je te montre tout de suite ce qui est disponible.";
const SUGGESTIONS = ['Je cherche à louer', 'Je veux acheter', 'Comment ça marche ?'];
const RELANCE_1 = "Tu hésites ? Pose-moi une question, j'y réponds tout de suite.";
const RELANCE_2_OFFRES =
  "Si une de ces offres te plaît, on s'en occupe pour toi dès aujourd'hui : visite, dossier, candidature et relances. Active ton mandat de recherche ici : https://logisorama.ch/nouveau-mandat";
const RELANCE_2_SANS =
  'Dis-moi simplement où tu cherches, combien de pièces et ton budget : je te montre ce qui est disponible.';
const RELANCE_1_DELAY_MS = 60_000;
const RELANCE_2_DELAY_MS = 120_000;
const TEASER_DELAY_MS = 8_000;
/** Pas de relance pour une conversation laissée de côté depuis plus de 30 minutes. */
const RELANCE_WINDOW_MS = 30 * 60 * 1000;
const SESSION_KEY = 'logisorama.steeve-public.session';
const HISTORY_KEY = 'logisorama.steeve-public.conversation';
const TEASER_KEY = 'logisorama.steeve-public.teaser-vu';
const MAX_CHARS = 1000;
const MAX_STORED = 40;
/** L'identifiant de visite est renouvelé après 30 jours sans échange. */
const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // stockage indisponible (navigation privée) : la conversation reste en mémoire
  }
}

/** Identifiant de visite (aléatoire), gardé tant que la conversation sert, renouvelé après 30 jours sans échange. */
function sessionId(): string {
  try {
    const stored = JSON.parse(readLocal(SESSION_KEY) || 'null');
    if (stored && /^[A-Za-z0-9-]{8,64}$/.test(stored.id) && Date.now() - Number(stored.at) < SESSION_IDLE_MS) {
      writeLocal(SESSION_KEY, JSON.stringify({ id: stored.id, at: Date.now() }));
      return stored.id;
    }
  } catch {
    // ancienne forme ou valeur illisible : on en crée une nouvelle
  }
  const id = crypto.randomUUID();
  writeLocal(SESSION_KEY, JSON.stringify({ id, at: Date.now() }));
  return id;
}

/** Conversation gardée sur l'appareil : elle survit à la fermeture de l'app, pas au vidage du cache. */
function loadHistory(): ChatMessage[] {
  try {
    const parsed = JSON.parse(readLocal(HISTORY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
          .slice(-MAX_STORED)
      : [];
  } catch {
    return [];
  }
}

function chf(n: number): string {
  return `CHF ${Math.round(n).toLocaleString('de-CH')}.-`;
}

function OfferCardView({ offer, onLike, disabled }: { offer: OfferCard; onLike: (o: OfferCard) => void; disabled: boolean }) {
  const details = [
    offer.pieces ? `${offer.pieces} pièces` : null,
    offer.surface ? `${offer.surface} m²` : null,
  ].filter(Boolean).join(' · ');
  const isSale = (offer.prix ?? 0) > 20000;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex gap-3 p-2.5">
        {offer.photo && (
          <img src={offer.photo} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{details || offer.titre}</p>
          {(offer.ville || offer.npa) && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {[offer.npa, offer.ville].filter(Boolean).join(' ')}
            </p>
          )}
          {offer.prix ? (
            <p className="mt-0.5 text-sm font-semibold text-primary">
              {chf(offer.prix)}
              {!isSale && <span className="text-xs font-normal text-muted-foreground"> /mois</span>}
            </p>
          ) : null}
          {offer.disponibilite && <p className="text-xs text-muted-foreground">Dispo : {offer.disponibilite}</p>}
        </div>
      </div>
      {offer.atouts && <p className="line-clamp-2 px-2.5 pb-2 text-xs text-muted-foreground">{offer.atouts}</p>}
      <div className="flex gap-2 border-t border-border p-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onLike(offer)}
          className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Heart className="h-3.5 w-3.5" aria-hidden /> Elle me plaît
        </button>
        {offer.lien && (
          <a
            href={offer.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[36px] items-center justify-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            Voir l'annonce
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Steeve sur le site public et le portail d'annonces : il demande ce que le visiteur cherche, lui montre des
 * offres disponibles et l'invite à activer son mandat. N'apparaît que si l'équipe l'a activé
 * (app_config.steeve_public_enabled), et pas pour un utilisateur connecté (Steeve lui répond dans sa messagerie).
 */
export function SteevePublicChat({ hidden = false }: { hidden?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Invitations jouées par Steeve (bulle du personnage), jamais une ouverture forcée de la discussion.
  const [invite, setInvite] = useState<SteeveInvite | null>(null);
  const showInvite = (message: string) => setInvite((prev) => ({ key: (Number(prev?.key) || 0) + 1, message }));
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([supabase.rpc('get_steeve_public_settings'), supabase.auth.getSession()]).then(([settings, auth]) => {
      if (!active) return;
      const on = (settings.data as { enabled?: boolean } | null)?.enabled === true;
      setEnabled(on && !auth.data.session);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    writeLocal(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    // Échap ferme ; le focus revient alors sur Steeve (SteeveLauncher).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Première visite : petite invitation à côté du bouton, une seule fois.
  useEffect(() => {
    if (!enabled || open || hidden || messages.length > 0 || readLocal(TEASER_KEY)) return;
    const t = setTimeout(() => {
      showInvite('Tu cherches un logement ? Dis-moi ce que tu cherches !');
      writeLocal(TEASER_KEY, '1');
    }, TEASER_DELAY_MS);
    return () => clearTimeout(t);
  }, [enabled, open, hidden, messages.length]);

  // Relances : sans réponse du visiteur après une proposition de Steeve, deux relances au plus.
  useEffect(() => {
    if (!enabled || sending || draft.trim()) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.at || Date.now() - last.at > RELANCE_WINDOW_MS) return;
    const shownOffers = messages.some((m) => m.offers?.length);
    let next: string | null = null;
    let delay = 0;
    if (!last.local && (last.offers?.length || /\?\s*$/.test(last.content))) {
      next = RELANCE_1;
      delay = RELANCE_1_DELAY_MS;
    } else if (last.local && last.content === RELANCE_1) {
      next = shownOffers ? RELANCE_2_OFFRES : RELANCE_2_SANS;
      delay = RELANCE_2_DELAY_MS;
    }
    if (!next) return;
    const text = next;
    const t = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      if (open) setMessages((prev) => [...prev, { role: 'assistant', content: text, local: true, at: Date.now() }]);
      else if (text === RELANCE_1) showInvite('Tu hésites ? Pose-moi une question !');
    }, delay);
    return () => clearTimeout(t);
  }, [enabled, messages, sending, draft, open]);

  const send = useCallback(async (text: string) => {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || sending) return;
    const next = [...messages, { role: 'user' as const, content, at: Date.now() }];
    setMessages(next);
    setDraft('');
    setSending(true);
    try {
      const history = next.filter((m) => !m.local).slice(-10).map(({ role, content: c, sig }) => ({ role, content: c, sig }));
      const { data, error } = await supabase.functions.invoke('steeve-public', {
        body: { session_id: sessionId(), messages: history },
      });
      if ((data as { enabled?: boolean } | null)?.enabled === false) {
        setEnabled(false);
        return;
      }
      if (error || !data?.reply) throw error ?? new Error('réponse vide');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: String(data.reply),
        sig: typeof data.sig === 'string' ? data.sig : undefined,
        offers: Array.isArray(data.offers) ? (data.offers as OfferCard[]).slice(0, 2) : undefined,
        at: Date.now(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        local: true,
        content: "Désolé, je n'arrive pas à répondre pour le moment. Réessaie dans un instant, ou confie ta recherche à notre équipe ici : https://logisorama.ch/nouveau-mandat",
      }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  if (!enabled) return null;

  const restart = () => {
    setMessages([]);
    writeLocal(HISTORY_KEY, null);
    writeLocal(SESSION_KEY, null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const like = (o: OfferCard) => {
    const desc = [o.pieces ? `${o.pieces} pièces` : o.titre, o.ville ? `à ${o.ville}` : null].filter(Boolean).join(' ');
    void send(`Oui, l'offre ${desc} me plaît !`);
  };

  const all: ChatMessage[] = [{ role: 'assistant', content: GREETING, local: true }, ...messages];

  return (
    <div
      data-floating-widget
      className={cn(
        'fixed right-2 z-[60] flex flex-col items-end gap-2 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] sm:flex-row sm:items-end sm:gap-3 lg:bottom-4 lg:right-4',
        hidden && 'pointer-events-none invisible',
      )}
    >
      {open && (
        <div
          role="dialog"
          aria-label="Discuter avec Steeve"
          className="flex h-[min(560px,calc(100dvh-260px))] w-[min(380px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:h-[min(560px,calc(100dvh-120px))] sm:w-[min(380px,calc(100vw-160px))]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Steeve</p>
              <p className="truncate text-xs opacity-80">Assistant Logisorama · disponible 24h/24</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/15"
                  aria-label="Nouvelle conversation"
                  title="Nouvelle conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 transition-colors hover:bg-white/15"
                aria-label="Fermer la discussion"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 text-sm" aria-live="polite" aria-relevant="additions">
            {all.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 leading-relaxed',
                    m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
                  )}
                >
                  <LinkifiedText text={m.content} />
                </div>
                {m.offers?.length ? (
                  <div className="w-[92%] space-y-2">
                    {m.offers.map((o) => (
                      <OfferCardView key={o.ref} offer={o} onLike={like} disabled={sending} />
                    ))}
                  </div>
                ) : null}
                {m.role === 'assistant' && m.content.includes('logisorama.ch/nouveau-mandat') && (
                  <Link
                    to="/nouveau-mandat"
                    className="flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm"
                  >
                    Activer mon mandat de recherche <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Steeve cherche…
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
                    className="min-h-[36px] rounded-full border border-primary/40 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/10"
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
              placeholder="Écris ce que tu cherches…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); }
              }}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary sm:text-sm"
              aria-label="Ton message pour Steeve"
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
            Steeve répond avec les informations du site et les offres disponibles, avec l'aide d'un service d'IA (Anthropic).
            N'indique pas de données personnelles ici.{' '}
            <a href="/politique-confidentialite" className="underline underline-offset-2">Confidentialité</a>
          </p>
        </div>
      )}

      <SteeveLauncher
        open={open}
        busy={sending}
        invite={invite}
        onActivate={() => setOpen((v) => !v)}
      />
    </div>
  );
}
