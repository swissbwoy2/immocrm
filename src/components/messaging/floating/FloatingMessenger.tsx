import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingMessengerBubble } from './FloatingMessengerBubble';
import { FloatingConversationList } from './FloatingConversationList';
import { FloatingConversationView } from './FloatingConversationView';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const { isOpen, close, activeConversationId, setActiveConversation } = useFloatingMessenger();
  const isMobile = useIsMobile();

  // Reset active conversation when widget closes
  useEffect(() => {
    if (!isOpen) {
      // small delay so close animation isn't disturbed
      const t = setTimeout(() => setActiveConversation(null), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, setActiveConversation]);

  // Don't render until auth loaded; only for logged-in users with eligible roles
  if (loading || !user || !userRole) return null;
  const eligibleRoles = ['admin', 'agent', 'client', 'proprietaire'];
  if (!eligibleRoles.includes(userRole)) return null;

  return (
    <>
      <FloatingMessengerBubble />

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
                  : 'fixed z-50 right-4 md:right-6 bottom-24 md:bottom-24 w-[380px] h-[560px] rounded-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden'
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
