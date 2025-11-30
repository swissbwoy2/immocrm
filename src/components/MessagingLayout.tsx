import { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showConversations, setShowConversations] = useState(true);

  // Attendre que le hook isMobile soit initialisé avant d'appliquer les effets
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Fermer automatiquement le panneau quand une conversation est sélectionnée sur mobile
  useEffect(() => {
    if (isInitialized && isMobile && selectedConversation) {
      setShowConversations(false);
    }
  }, [selectedConversation, isMobile, isInitialized]);

  // Ouvrir le panneau si aucune conversation n'est sélectionnée sur mobile
  useEffect(() => {
    if (isInitialized && isMobile && !selectedConversation) {
      setShowConversations(true);
    }
  }, [isMobile, selectedConversation, isInitialized]);

  // Swipe gestures
  useSwipeGesture({
    onSwipeRight: () => {
      if (isInitialized && isMobile && !showConversations) {
        setShowConversations(true);
      }
    },
    onSwipeLeft: () => {
      if (isInitialized && isMobile && showConversations) {
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

  // Pour éviter le flash, utiliser effectiveIsMobile seulement après initialisation
  const effectiveIsMobile = isInitialized && isMobile;

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] lg:h-[calc(100vh-0px)] relative">
      {/* Overlay pour mobile */}
      {effectiveIsMobile && showConversations && selectedConversation && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden"
          onClick={() => setShowConversations(false)}
        />
      )}

      {/* Panneau des conversations */}
      <div
        className={cn(
          "bg-card border-r border-border flex flex-col",
          // Desktop: toujours visible
          "lg:relative lg:w-80 lg:translate-x-0",
          // Mobile: panneau coulissant
          "fixed lg:static inset-y-0 left-0 z-50 w-[85%] max-w-[320px]",
          "transition-transform duration-300 ease-out",
          effectiveIsMobile && !showConversations && "-translate-x-full"
        )}
      >
        {conversationsList}
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile avec bouton retour */}
        {effectiveIsMobile && selectedConversation && (
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

        {/* Header desktop */}
        {!effectiveIsMobile && selectedConversation && chatHeader && (
          <div className="p-4 border-b bg-card">
            {chatHeader}
          </div>
        )}

        {/* Bouton pour ouvrir les conversations sur mobile quand aucune n'est sélectionnée */}
        {effectiveIsMobile && !selectedConversation && !showConversations && (
          <div className="p-4 border-b bg-card lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversations(true)}
              className="gap-2"
            >
              <Menu className="h-4 w-4" />
              Voir les conversations
            </Button>
          </div>
        )}

        {chatView}
      </div>
    </div>
  );
}
