import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClientParcours } from '@/hooks/useClientParcours';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileImmersive } from '@/contexts/MobileImmersiveContext';
import { MobileBottomNav, isClientGlassNav } from './MobileBottomNav';
import { NotificationBell } from '@/components/NotificationBell';
import { SilentErrorBoundary } from '@/components/SilentErrorBoundary';
import logoLogisorama from '@/assets/logisorama-logo.png';

/**
 * App-shell mobile : header fixe, zone scrollable unique, bottom nav fixe.
 * Le header ne bouge jamais au scroll (fix du header qui se rabat sur iOS).
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();
  const { user, userRole } = useAuth();
  const { immersive } = useMobileImmersive();
  const navigate = useNavigate();
  const isClient = userRole === 'client';
  const isStaff = userRole === 'admin' || userRole === 'agent';
  const parcours = useClientParcours(isClient);
  const glassNav = isClientGlassNav(userRole, parcours);
  // Compteurs non lus (table notifications de l'utilisateur) : client, et admin/agent pour l'icône Messagerie.
  const unread = useClientUnread(isClient || isStaff ? user?.id ?? null : null);
  const messagerieHref = isClient ? '/client/messagerie' : isStaff ? `/${userRole}/messagerie` : null;

  // Coquille native uniquement : verrouille le scroll du document (html/body)
  // pour que seule la zone scrollable interne bouge. N'impacte pas le web public.
  useEffect(() => {
    document.documentElement.classList.add('imr-native-shell');
    return () => {
      document.documentElement.classList.remove('imr-native-shell');
    };
  }, []);

  return (
    <div
      className="imr-mobile-shell fixed inset-0 flex w-full flex-col overflow-hidden bg-background"
    >
      {/* HEADER FIXE (masqué en mode immersif : conversation plein écran) */}
      {!immersive && (
      <header
        className="z-30 flex shrink-0 items-center gap-2 border-b bg-background px-3"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 w-full items-center gap-2">
          <button
            onClick={() => setOpenMobile(true)}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setOpenMobile(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-80"
            aria-label="Ouvrir le menu principal"
          >
            <img src={logoLogisorama} alt="Logisorama" className="h-6 w-auto object-contain" />
          </button>
          {messagerieHref && (
            <button
              type="button"
              onClick={() => navigate(messagerieHref)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
              aria-label={unread.messages > 0 ? `Messagerie (${unread.messages} non lus)` : 'Messagerie'}
            >
              <MessageCircle className="h-5 w-5" />
              {unread.messages > 0 && (
                <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
                  {unread.messages > 9 ? '9+' : unread.messages}
                </span>
              )}
            </button>
          )}
          <SilentErrorBoundary>
            <NotificationBell />
          </SilentErrorBoundary>
        </div>
      </header>
      )}

      {/* ZONE SCROLLABLE UNIQUE */}
      <main
        className="imr-app-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          // La bulle flotte au-dessus du contenu : on réserve sa hauteur en bas.
          ...(glassNav && !immersive
            ? { paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 78px)' }
            : null),
        }}
      >
        {children}
      </main>

      {/* BOTTOM NAV FIXE (masquée en mode immersif) */}
      {!immersive && (
        <MobileBottomNav role={userRole} badges={{ offres: unread.offres, agenda: unread.agenda }} />
      )}
    </div>
  );
}

/** Compteurs non lus du client (messages, offres, visites) pour l'en-tête et la barre du bas. */
function useClientUnread(userId: string | null) {
  const [unread, setUnread] = useState({ messages: 0, offres: 0, agenda: 0 });
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', userId)
        .eq('read', false)
        .limit(200);
      if (!alive || error || !data) return;
      const count = (types: string[]) => data.filter((n: { type: string }) => types.includes(n.type)).length;
      setUnread({
        messages: count(['new_message']),
        offres: count(['new_offer']),
        agenda: count(['new_visit', 'visit_reminder']),
      });
    })();
    return () => { alive = false; };
  }, [userId]);
  return unread;
}
