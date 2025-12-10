import { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface MessagingLayoutProps {
  conversationsList: ReactNode;
  chatView: ReactNode;
  selectedConversation: string | null;
  onSelectConversation?: (id: string | null) => void;
  chatHeader?: ReactNode;
}

export function MessagingLayout({
  conversationsList,
  chatView,
  selectedConversation,
  onSelectConversation,
  chatHeader,
}: MessagingLayoutProps) {
  const [showConversations, setShowConversations] = useState(true);

  // Fermer automatiquement le panneau quand une conversation est sélectionnée sur mobile
  useEffect(() => {
    if (selectedConversation) {
      // On mobile, hide the panel when a conversation is selected
      const checkMobile = () => window.innerWidth < 1024;
      if (checkMobile()) {
        setShowConversations(false);
      }
    }
  }, [selectedConversation]);

  // Swipe gestures
  useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 1024 && !showConversations) {
        setShowConversations(true);
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && showConversations) {
        setShowConversations(false);
      }
    },
    threshold: 60,
    edgeThreshold: 40,
  });

  const handleBackToList = () => {
    setShowConversations(true);
    onSelectConversation?.(null);
  };

  const handleOpenConversations = () => {
    setShowConversations(true);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden relative">
      {/* Overlay pour mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden",
          showConversations && selectedConversation ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowConversations(false)}
      />

      {/* Panneau des conversations - Style WhatsApp - Zone de scroll indépendante */}
      <div
        className={cn(
          "bg-card border-r border-border/50 flex flex-col overflow-y-auto overflow-x-hidden",
          // Desktop: toujours visible avec hauteur fixe
          "lg:relative lg:w-[360px] lg:translate-x-0 lg:h-full lg:shrink-0",
          // Tablet: largeur intermédiaire
          "md:w-[320px]",
          // Mobile: panneau coulissant avec transition et hauteur pleine
          "fixed lg:static inset-y-0 left-0 z-50 w-[85%] max-w-[360px] h-full",
          "transition-transform duration-300 ease-out",
          // Cacher sur mobile quand showConversations est false
          !showConversations ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        )}
      >
        {conversationsList}
      </div>

      {/* Zone de chat - Zone de scroll indépendante */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Indicateur swipe discret sur mobile */}
        {selectedConversation && (
          <div className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-muted-foreground/20 rounded-r-full pointer-events-none z-10" />
        )}

        {/* Bouton retour vers les conversations - visible quand le panneau est masqué */}
        {selectedConversation && !showConversations && (
          <div className="flex items-center gap-2 p-3 border-b bg-card lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">Retour aux conversations</span>
          </div>
        )}

        {/* Bouton menu mobile quand aucune conversation n'est sélectionnée */}
        {!selectedConversation && (
          <div className="flex items-center gap-2 p-3 border-b bg-card lg:hidden">
            <SidebarTrigger className="shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenConversations}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-medium">Conversations</span>
          </div>
        )}

        {chatView}
      </div>
    </div>
  );
}
