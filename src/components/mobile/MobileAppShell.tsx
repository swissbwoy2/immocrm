import { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationBell } from '@/components/NotificationBell';
import { SilentErrorBoundary } from '@/components/SilentErrorBoundary';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

/**
 * App-shell mobile : header fixe, zone scrollable unique, bottom nav fixe.
 * Le header ne bouge jamais au scroll (fix du header qui se rabat sur iOS).
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();
  const { userRole } = useAuth();
  const { immersive } = useMobileImmersive();

  return (
    <div
      className="flex w-full flex-col overflow-hidden bg-background"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
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
            <img src={logoImmoRama} alt="Logisorama" className="h-8 w-auto object-contain" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-base font-semibold">Logisorama</span>
              <span className="truncate text-[10px] text-muted-foreground">by Immo-rama.ch</span>
            </span>
          </button>
          <SilentErrorBoundary>
            <NotificationBell />
          </SilentErrorBoundary>
        </div>
      </header>

      {/* ZONE SCROLLABLE UNIQUE */}
      <main
        className="imr-app-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {children}
      </main>

      {/* BOTTOM NAV FIXE */}
      <MobileBottomNav role={userRole} />
    </div>
  );
}
