import { ReactNode, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileImmersive } from '@/contexts/MobileImmersiveContext';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationBell } from '@/components/NotificationBell';
import { SilentErrorBoundary } from '@/components/SilentErrorBoundary';
import logoLogisorama from '@/assets/logisorama-logo.png';

/**
 * App-shell mobile : header fixe, zone scrollable unique, bottom nav fixe.
 * Le header ne bouge jamais au scroll (fix du header qui se rabat sur iOS).
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();
  const { userRole } = useAuth();
  const { immersive } = useMobileImmersive();

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
            <span
              role="img"
              aria-label="Logisorama"
              className="h-7 w-24"
              style={{
                maskImage: `url(${logoLogisorama})`,
                WebkitMaskImage: `url(${logoLogisorama})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'left center',
                WebkitMaskPosition: 'left center',
                backgroundColor: 'hsl(var(--imr-green))',
              }}
            />
          </button>
          <SilentErrorBoundary>
            <NotificationBell />
          </SilentErrorBoundary>
        </div>
      </header>
      )}

      {/* ZONE SCROLLABLE UNIQUE */}
      <main
        className="imr-app-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {children}
      </main>

      {/* BOTTOM NAV FIXE (masquée en mode immersif) */}
      {!immersive && <MobileBottomNav role={userRole} />}
    </div>
  );
}
