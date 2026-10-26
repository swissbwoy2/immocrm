import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { useAuth } from '@/contexts/AuthContext';
import { SteeveLauncher } from '@/components/steeve/SteeveLauncher';
import { SteeveCandidatChat } from '@/components/steeve/SteeveCandidatChat';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { FloatingConversationList } from './FloatingConversationList';
import { FloatingConversationView } from './FloatingConversationView';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SteevePartnerHeader, SteevePartnerPanel } from '@/components/steeve/SteevePartnerChat';

const SteevePartnerChat = lazy(() => import('@/components/steeve/SteevePartnerChat').then((m) => ({ default: m.SteevePartnerChat })));

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
};

const panelMobileVariants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 280 } },
  exit: { opacity: 0, y: '100%', transition: { duration: 0.22 } },
};

export function FloatingMessenger() {
  const { user, userRole, loading } = useAuth();
  // Admin et propriétaire : un clic sur Steeve ouvre la conversation avec Steeve ; la flèche ramène aux messages.
  const steeveSpace = userRole === 'admin' ? 'admin' as const : userRole === 'proprietaire' ? 'proprietaire' as const : null;
  const [steeveOpen, setSteeveOpen] = useState(false);
  const { isOpen, close, toggle, activeConversationId, setActiveConversation, unreadCount, hasNew, busy, setBusy, cue, react } = useFloatingMessenger();
  useEffect(() => {
    if (isOpen) {
      if (steeveSpace) setSteeveOpen(true);
      return;
    }
    const t = setTimeout(() => setSteeveOpen(false), 250);
    return () => clearTimeout(t);
  }, [isOpen, steeveSpace]);
  const { tapLight } = useHapticFeedback();
  // Un nouveau message arrivé messagerie fermée : Steeve le signale une fois (sans ouvrir la messagerie).
  useEffect(() => {
    if (hasNew && !isOpen) react('invite', 'Tu as un nouveau message !');
  }, [hasNew, isOpen, react]);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Reset active conversation when widget closes
  useEffect(() => {
    if (!isOpen) {
      // small delay so close animation isn't disturbed
      const t = setTimeout(() => setActiveConversation(null), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, setActiveConversation]);

  // Client : Steeve ouvre directement sa conversation (Steeve y répond), la plus récente s'il en a plusieurs ;
  // le bouton retour garde la liste.
  // La recherche n'est jamais annulée par un nouveau rendu : seul compte l'état réel au moment de la réponse
  // (messagerie toujours ouverte, aucune conversation choisie entre-temps).
  const autoOpenedRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const activeRef = useRef(activeConversationId);
  isOpenRef.current = isOpen;
  activeRef.current = activeConversationId;
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isOpen) {
      autoOpenedRef.current = false;
      return;
    }
    if (userRole !== 'client' || !userId || activeRef.current || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    void (async () => {
      const { data: cli } = await supabase.from('clients').select('id').eq('user_id', userId).maybeSingle();
      if (!cli) return;
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', cli.id)
        .eq('conversation_type', 'client-agent')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (isOpenRef.current && !activeRef.current && convs?.[0]) setActiveConversation(convs[0].id);
    })();
  }, [isOpen, userRole, userId, setActiveConversation]);

  // Don't render until auth loaded; only for logged-in users with eligible roles
  if (loading || !user || !userRole) return null;
  // Candidat : Steeve l'aide à trouver et l'invite à activer son mandat (même assistant que sur le site).
  if (userRole === 'candidat') return <SteeveCandidatChat />;
  // Apporteur : pas de messagerie flottante, Steeve répond sur ses recommandations et commissions.
  if (userRole === 'apporteur') return <Suspense fallback={null}><SteevePartnerChat role="apporteur" /></Suspense>;
  const eligibleRoles = ['admin', 'agent', 'client', 'proprietaire'];
  if (!eligibleRoles.includes(userRole)) return null;

  // Hide floating messenger on the full Messagerie page — it overlaps
  // the composer's Send button and duplicates the surface the user is already in.
  if (/\/messagerie(\/|$)/i.test(location.pathname)) return null;

  return (
    <>
      {/* Steeve 3D remplace l'ancienne bulle : même action (ouvrir / fermer la messagerie existante). */}
      <div
        data-floating-widget
        className="steeve-app-launcher fixed z-[45] right-2 md:right-4"
      >
        <SteeveLauncher
          open={isOpen}
          unread={isOpen ? 0 : unreadCount}
          busy={busy}
          cue={cue}
          onActivate={() => { void tapLight(); toggle(); }}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={close}
              />
            )}

            <motion.div
              key="panel"
              variants={isMobile ? panelMobileVariants : panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={
                isMobile
                  ? 'imr-kb-sheet fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl bg-background border border-border/70 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden'
                  : 'fixed z-50 right-[180px] min-[1800px]:right-[200px] bottom-6 w-[380px] h-[min(560px,calc(100dvh-48px))] rounded-2xl bg-background border border-border/70 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden'
              }
              style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
            >
              {steeveOpen && steeveSpace ? (
                <>
                  <SteevePartnerHeader onBack={() => setSteeveOpen(false)} backLabel="Voir les messages" onClose={close} />
                  <SteevePartnerPanel role={steeveSpace} onBusy={setBusy} />
                </>
              ) : !activeConversationId ? (
                <>
                  {/* Header — list view */}
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquare className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 leading-tight">
                        <p className="text-base font-semibold text-foreground">Messages</p>
                        <p className="text-xs text-muted-foreground">Conversations Logisorama</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full hover:bg-muted" onClick={close} aria-label="Fermer">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {steeveSpace && (
                    <button
                      type="button"
                      onClick={() => setSteeveOpen(true)}
                      className="flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left hover:bg-muted/60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">S</span>
                      <span className="min-w-0 leading-tight">
                        <span className="block text-sm font-medium">Steeve</span>
                        <span className="block text-xs text-muted-foreground">{steeveSpace === 'admin' ? 'Copilote : chiffres, dossiers, journal' : 'Vos immeubles, baux, tickets et échéances'}</span>
                      </span>
                    </button>
                  )}
                  <FloatingConversationList onSelect={setActiveConversation} />
                </>
              ) : (
                <FloatingConversationView
                  conversationId={activeConversationId}
                  onBack={() => setActiveConversation(null)}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
