import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Menu } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { setOpenMobile, isMobile, openMobile } = useSidebar();

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
  });

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Mobile Header - toujours visible */}
        <header className="sticky top-0 z-20 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden shrink-0">
          <SidebarTrigger className="-ml-1 transition-transform duration-200 active:scale-95">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <button 
            onClick={() => setOpenMobile(true)}
            className="flex items-center gap-2 ml-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src={logoImmoRama} 
              alt="Immo-Rama Logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="font-semibold text-lg">ImmoCRM</span>
          </button>
        </header>
        
        {/* Main Content - zone de scroll */}
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
