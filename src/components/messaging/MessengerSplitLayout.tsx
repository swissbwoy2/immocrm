import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MobileMessenger } from '@/components/messaging/mobile/MobileMessenger';
import { ChatEmptyState } from '@/components/messaging/ConversationListParts';
import { IMR_CHAT_NEUTRAL_STYLE } from '@/components/messaging/messengerTheme';

/**
 * Hauteur conseillée pour une page messagerie rendue dans AppLayout :
 * remplit la zone du shell mobile (h-full), et le viewport dynamique sur PC (main non contraint).
 */
export const MESSENGER_PAGE_HEIGHT = 'h-full lg:h-[100dvh] [.imr-mobile-shell_&]:h-full';

/** Largeur à partir de laquelle la messagerie affiche deux panneaux (tablette et PC). */
export const MESSENGER_SPLIT_QUERY = '(min-width: 768px)';

function useSplitView() {
  const [split, setSplit] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MESSENGER_SPLIT_QUERY).matches
      : true,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(MESSENGER_SPLIT_QUERY);
    const onChange = () => setSplit(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return split;
}

interface MessengerSplitLayoutProps {
  /** Colonne « conversations » (en-tête, recherche, filtres, liste). */
  conversationsList: ReactNode;
  /** Vue de la conversation ouverte (messages + saisie), sans en-tête. */
  chatView: ReactNode;
  /** En-tête de conversation affiché au-dessus de chatView en vue deux panneaux (ex. <ChatHeader />). */
  chatHeader?: ReactNode;
  selectedConversation: string | null;
  /** Retour à la liste (vue mobile). */
  onBack: () => void;
  /** En-tête mobile (un panneau à la fois). */
  headerName?: string;
  headerSubtitle?: string;
  headerAvatarUrl?: string | null;
  isOnline?: boolean;
  headerActions?: ReactNode;
  /** Contenu affiché à droite quand aucune conversation n'est ouverte (vue deux panneaux). */
  emptyState?: ReactNode;
  /** Hauteur de la racine. Par défaut h-full (remplit la zone du shell / du main). */
  className?: string;
}

/**
 * Ossature commune de la messagerie :
 * - ≥ 768 px (tablette, PC) : deux panneaux, liste 340-380 px | conversation.
 * - < 768 px : un panneau à la fois (MobileMessenger : retour, glisser pour revenir, mode immersif).
 * Remplit son parent (h-full) : aucun calcul de hauteur de viewport ici.
 */
export function MessengerSplitLayout({
  conversationsList,
  chatView,
  chatHeader,
  selectedConversation,
  onBack,
  headerName,
  headerSubtitle,
  headerAvatarUrl,
  isOnline,
  headerActions,
  emptyState,
  className,
}: MessengerSplitLayoutProps) {
  const split = useSplitView();

  if (!split) {
    return (
      <div className={cn('h-full min-h-0', className)}>
        <MobileMessenger
          conversationsList={conversationsList}
          chatView={chatView}
          selectedConversation={selectedConversation}
          onBack={onBack}
          headerName={headerName}
          headerSubtitle={headerSubtitle}
          headerAvatarUrl={headerAvatarUrl}
          isOnline={isOnline}
          headerActions={headerActions}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('imr-chat flex h-full min-h-0 w-full overflow-hidden bg-background', className)}
      style={IMR_CHAT_NEUTRAL_STYLE}
    >
      <aside
        className="flex h-full min-h-0 w-[340px] shrink-0 flex-col overflow-hidden border-r border-border/70 bg-card lg:w-[360px] xl:w-[380px]"
        aria-label="Conversations"
      >
        {conversationsList}
      </aside>
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Conversation">
        {selectedConversation ? (
          <>
            {chatHeader && <div className="relative z-20 shrink-0">{chatHeader}</div>}
            {chatView}
          </>
        ) : (
          emptyState ?? <ChatEmptyState />
        )}
      </section>
    </div>
  );
}
