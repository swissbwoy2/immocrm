import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { useAuth } from '@/contexts/AuthContext';
import { SteeveLauncher } from '@/components/steeve/SteeveLauncher';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { FloatingConversationList } from './FloatingConversationList';
import { FloatingConversationView } from './FloatingConversationView';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { isOpen, close, toggle, activeConversationId, setActiveConversation, unreadCount, hasNew, busy, cue, react } = useFloatingMessenger();
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

  // Client avec une seule conversation : la bulle s'ouvre directement sur elle (le bouton retour garde la liste).
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      autoOpenedRef.current = false;
      return;
    }
    if (userRole !== 'client' || !user || activeConversationId || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data: cli } = await supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle();
      if (!cli || cancelled) return;
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', cli.id)
        .eq('conversation_type', 'client-agent')
        .limit(2);
      if (!cancelled && convs && convs.length === 1) setActiveConversation(convs[0].id);
    })();
    return () => { cancelled = true; };
  }, [isOpen, userRole, user, activeConversationId, setActiveConversation]);

  // Don't render until auth loaded; only for logged-in users with eligible roles
  if (loading || !user || !userRole) return null;
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
                  ? 'fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden'
                  : 'fixed z-50 right-[180px] min-[1800px]:right-[200px] bottom-6 w-[380px] h-[min(560px,calc(100dvh-48px))] rounded-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden'
              }
              style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
            >
              {!activeConversationId ? (
                <>
                  {/* Header — list view */}
                  <div className="flex items-center justify-between p-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm font-semibold">Messages</p>
                        <p className="text-[10px] text-muted-foreground">Conversations Logisorama</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={close} aria-label="Fermer">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

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
