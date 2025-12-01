import { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full relative">
      {/* Overlay pour mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden",
          showConversations && selectedConversation ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowConversations(false)}
      />

      {/* Panneau des conversations - Style WhatsApp */}
      <div
        className={cn(
          "bg-card border-r border-border/50 flex flex-col h-full",
          // Desktop: toujours visible
          "lg:relative lg:w-[360px] lg:translate-x-0",
          // Mobile: panneau coulissant avec transition
          "fixed lg:static inset-y-0 left-0 z-50 w-[85%] max-w-[360px]",
          "transition-transform duration-300 ease-out",
          // Cacher sur mobile quand showConversations est false
          !showConversations ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        )}
      >
        {conversationsList}
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header mobile avec bouton retour - toujours visible sur mobile quand une conversation est sélectionnée */}
        {selectedConversation && (
          <div className="flex items-center gap-2 p-3 border-b bg-card lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {chatHeader}
            </div>
          </div>
        )}

        {/* Bouton menu mobile quand aucune conversation n'est sélectionnée */}
        {!selectedConversation && (
          <div className="flex items-center gap-2 p-3 border-b bg-card lg:hidden">
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

        {/* Header desktop */}
        {selectedConversation && chatHeader && (
          <div className="hidden lg:block p-4 border-b bg-card">
            {chatHeader}
          </div>
        )}

        {chatView}
      </div>
    </div>
  );
}
