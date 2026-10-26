import { ReactNode } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useImmersiveMode } from "@/contexts/MobileImmersiveContext";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { IMR_CHAT_NEUTRAL_STYLE } from "@/components/messaging/messengerTheme";

interface MobileMessengerProps {
  conversationsList: ReactNode;
  chatView: ReactNode;
  selectedConversation: string | null;
  onBack: () => void;
  headerName?: string;
  headerSubtitle?: string;
  headerAvatarUrl?: string | null;
  isOnline?: boolean;
  /** Optionnel : actions supplémentaires (boutons ronds) dans l'en-tête de conversation. */
  headerActions?: ReactNode;
}

/**
 * Messagerie mobile : un panneau à la fois.
 * - Aucune sélection → liste des conversations plein écran.
 * - Sélection → en-tête sobre (retour, avatar, nom, statut, appels) + chatView existant.
 * Remplit la zone du shell mobile (h-full) : aucun calcul de hauteur propre.
 * L'en-tête respecte la zone sûre iOS (le header de l'app est masqué en mode immersif).
 */
export function MobileMessenger({
  conversationsList,
  chatView,
  selectedConversation,
  onBack,
  headerName,
  headerSubtitle,
  headerAvatarUrl,
  isOnline,
  headerActions,
}: MobileMessengerProps) {
  useSwipeGesture({
    onSwipeRight: () => {
      if (selectedConversation) onBack();
    },
    threshold: 60,
    edgeThreshold: 40,
  });

  // Conversation ouverte → plein écran (header app + bottom nav masqués)
  useImmersiveMode(!!selectedConversation);

  if (!selectedConversation) {
    return (
      <div
        className="imr-chat flex h-full min-h-0 flex-col overflow-hidden bg-card"
        style={IMR_CHAT_NEUTRAL_STYLE}
      >
        {conversationsList}
      </div>
    );
  }

  return (
    <div
      className="imr-chat flex flex-col h-full min-h-0 overflow-hidden bg-background"
      style={IMR_CHAT_NEUTRAL_STYLE}
    >
      {/* En-tête de conversation (zone sûre iOS en haut) + bandeau Steeve */}
      <div
        className="sticky top-0 z-30 shrink-0 bg-card"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <ChatHeader
          name={headerName || "Agent"}
          avatarUrl={headerAvatarUrl ?? null}
          isOnline={isOnline || undefined}
          subtitle={isOnline ? undefined : headerSubtitle}
          conversationId={selectedConversation}
          onBackClick={onBack}
          backAlwaysVisible
          actions={headerActions}
        />
      </div>

      {/* Vue de conversation existante (messages, cartes d'offre, vidéo, saisie, dialogues) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {chatView}
      </div>
    </div>
  );
}
