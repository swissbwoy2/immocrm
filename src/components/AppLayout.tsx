import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Menu } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { PageTransition } from '@/components/PageTransition';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePresence } from '@/hooks/usePresence';
import { FloatingMessengerProvider } from '@/hooks/useFloatingMessenger';
import { FloatingMessenger } from '@/components/messaging/floating/FloatingMessenger';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { DemoWriteGuard } from '@/components/DemoWriteGuard'; import { ClientVisitDecisionGate } from '@/components/client/ClientVisitDecisionGate';
import { OpenInBrowserBanner } from '@/components/client/OpenInBrowserBanner';
import { MobileAppShell } from '@/components/mobile/MobileAppShell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { MobileImmersiveProvider } from '@/contexts/MobileImmersiveContext';

interface AppLayoutProps {
  children: ReactNode;
}


function AppLayoutContent({ children }: AppLayoutProps) {
  const { setOpenMobile, isMobile, openMobile } = useSidebar();
  
  // Initialize push notifications for mobile apps
  usePushNotifications();
  
  // Track user presence (online status)
  usePresence();

  // Swipe gestures for mobile sidebar
  useSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && !openMobile) {
        setOpenMobile(true);
      }
    },
    onSwipeLeft: () => {
      if (isMobile && openMobile) {
        setOpenMobile(false);
      }
    },
    threshold: 60,
    edgeThreshold: 40,
    enableHaptics: true,
  });

  const isMobileViewport = useIsMobile();
  const { userRole } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const shellRoles = ['admin', 'agent', 'client'];
  const useAppShell = (isMobileViewport || isNative) && shellRoles.includes(userRole || '');

  if (useAppShell) {
    return (
      <>
        <OfflineIndicator />
        <DemoWriteGuard /><ClientVisitDecisionGate />
        <AppSidebar />
        <MobileAppShell>
          <DemoModeBanner />
          <OpenInBrowserBanner />
          <PageTransition>{children}</PageTransition>
        </MobileAppShell>
        <FloatingMessenger />
      </>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <OfflineIndicator />
      <DemoWriteGuard /><ClientVisitDecisionGate />
      <AppSidebar />
      <div className="flex-1 flex flex-col w-full min-w-0">
        <DemoModeBanner />
        <OpenInBrowserBanner />
        {/* Mobile Header - toujours visible */}
        <header className="sticky top-0 z-20 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden shrink-0">
          <SidebarTrigger 
            className="-ml-1 transition-transform duration-200 active:scale-95"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <button 
            onClick={() => setOpenMobile(true)}
            className="flex items-center gap-2 ml-3 hover:opacity-80 transition-opacity"
            aria-label="Ouvrir le menu principal"
          >
            <img 
              src={logoImmoRama} 
              alt="Logo Immo-Rama - Retour à l'accueil" 
              className="h-8 w-auto object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-base">Logisorama</span>
              <span className="text-[10px] text-muted-foreground">by Immo-rama.ch</span>
            </div>
          </button>
        </header>
        
        {/* Main Content - avec animations de transition */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <FloatingMessenger />
    </div>
  );
}


export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <MobileImmersiveProvider>
        <FloatingMessengerProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </FloatingMessengerProvider>
      </MobileImmersiveProvider>
    </SidebarProvider>
  );
}
