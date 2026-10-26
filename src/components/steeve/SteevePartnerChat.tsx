import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, RotateCcw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { SteeveLauncher, type SteeveCue } from '@/components/steeve/SteeveLauncher';

export type PartnerRole = 'proprietaire' | 'annonceur' | 'apporteur';
/** « admin » : copilote de l'administrateur (fonction steeve-admin), les autres : steeve-partner. */
export type SteeveSpace = PartnerRole | 'admin';
type Msg = { role: 'user' | 'assistant'; content: string };

const STORAGE_PREFIX = 'logisorama.steeve-partenaire.';
const SUGGESTIONS: Record<SteeveSpace, string[]> = {
  admin: ['Quoi de neuf aujourd’hui ?', 'Quels dossiers sont bloqués ?', 'Qu’a fait Steeve aujourd’hui ?', 'Quelles activations dois-je encaisser ?'],
  proprietaire: ['Quels baux arrivent à échéance ?', 'Où en sont mes tickets ?', 'Ai-je des écritures en retard ?', 'Quelles sont mes prochaines échéances ?'],
  annonceur: ['Comment vont mes annonces ?', 'Pourquoi mon annonce a été refusée ?', 'Qui est inscrit à mes visites ?', 'Comment avoir plus de contacts ?'],
  apporteur: ['Où en sont mes recommandations ?', 'Quand serai-je payé ?', 'Que dit mon contrat ?', 'Comment recommander un client ?'],
};
const INTRO: Record<SteeveSpace, string> = {
  admin: 'je suis Steeve, ton copilote. Je lis les chiffres, les dossiers et mon journal, je propose des priorités et je lance une tâche si tu me le demandes.',
  proprietaire: 'je suis Steeve. Je peux vous dire où en sont vos immeubles, baux, tickets et échéances, et transmettre une demande à votre agent.',
  annonceur: 'je suis Steeve. Je peux vous dire comment vont vos annonces, vos visites et vos candidatures, et vous aider à les améliorer.',
  apporteur: 'je suis Steeve. Je peux vous dire où en sont vos recommandations et vos commissions, et transmettre une question à l’équipe.',
};

/**
 * Conversation avec Steeve pour un partenaire (propriétaire, annonceur, apporteur). Le fil reste dans l'onglet
 * (sessionStorage, par compte) ; le serveur vérifie le rôle et ne lit que les données de la personne connectée.
 */
export function SteevePartnerPanel({ role, onBusy }: { role: SteeveSpace; onBusy?: (b: boolean) => void }) {
  const { user } = useAuth();
  const key = user ? `${STORAGE_PREFIX}${role}.${user.id}` : null;
  const admin = role === 'admin';
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (!key) return [];
    try { return JSON.parse(sessionStorage.getItem(key) || '[]'); } catch { return []; }
  });
  const [prenom, setPrenom] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (active) setPrenom((data as { prenom?: string | null } | null)?.prenom ?? null);
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (key) { try { sessionStorage.setItem(key, JSON.stringify(messages.slice(-30))); } catch { /* stockage indisponible */ } }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, key]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 2000);
    if (!content || sending) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setSending(true);
    onBusy?.(true);
    try {
      const { data, error } = admin
        ? await supabase.functions.invoke('steeve-admin', { body: { messages: next.slice(-12) } })
        : await supabase.functions.invoke('steeve-partner', { body: { role, messages: next.slice(-12) } });
      if (error || !data?.reply) throw error ?? new Error('réponse vide');
      setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Je n'arrive pas à répondre pour le moment. Réessayez dans un instant." }]);
    } finally {
      setSending(false);
      onBusy?.(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} data-imr-chat-scroll className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 leading-relaxed">
          {admin ? 'Salut' : 'Bonjour'}{prenom ? ` ${prenom}` : ''}, {INTRO[role]}
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[role].map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} className="min-h-[36px] rounded-full border border-primary/40 bg-background px-3 py-1 text-xs hover:bg-primary/10">{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 leading-relaxed',
              m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted')}>{m.content}</div>
          </div>
        ))}
        {sending && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Steeve regarde vos données…</div>}
      </div>
      <form className="flex items-end gap-2 border-t border-border/70 p-3" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setMessages([])} aria-label="Nouvelle conversation" title="Nouvelle conversation">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <textarea
          value={draft}
          rows={1}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
          placeholder={admin ? 'Demande à Steeve…' : 'Posez votre question à Steeve…'}
          aria-label="Question pour Steeve"
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-base outline-none focus:border-primary sm:text-sm"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !draft.trim()} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/** Entête « Steeve » d'un panneau (avec retour facultatif, ex. depuis la liste des conversations). */
export function SteevePartnerHeader({ onBack, onClose, backLabel = 'Retour' }: { onBack?: () => void; onClose?: () => void; backLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {onBack && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={onBack} aria-label={backLabel} title={backLabel}><ArrowLeft className="h-4 w-4" /></Button>}
        <div className="min-w-0 leading-tight">
          <p className="text-base font-semibold text-foreground">Steeve</p>
          <p className="text-xs text-muted-foreground">Votre assistant Logisorama</p>
        </div>
      </div>
      {onClose && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full hover:bg-muted" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></Button>}
    </div>
  );
}

/** Steeve 3D + panneau, pour les espaces sans messagerie flottante (annonceur, apporteur). */
export function SteevePartnerChat({ role }: { role: PartnerRole }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cue] = useState<SteeveCue | null>(null);
  if (!user) return null;
  return (
    <>
      <div data-floating-widget className="steeve-app-launcher fixed z-[45] right-2 md:right-4">
        <SteeveLauncher open={open} busy={busy} cue={cue} onActivate={() => setOpen((o) => !o)} />
      </div>
      <AnimatePresence>
        {open && (
          <>
            {isMobile && <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}
            <motion.div
              key="panel"
              role="dialog"
              aria-label="Steeve"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              className={isMobile
                ? 'imr-kb-sheet fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-3xl border border-border/70 bg-background shadow-2xl'
                : 'fixed bottom-6 right-[180px] z-50 flex h-[min(560px,calc(100dvh-48px))] w-[380px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl min-[1800px]:right-[200px]'}
              style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
            >
              <SteevePartnerHeader onClose={() => setOpen(false)} />
              <SteevePartnerPanel role={role} onBusy={setBusy} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
