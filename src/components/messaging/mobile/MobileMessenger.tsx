import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/messaging/ChatAvatar";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

interface MobileMessengerProps {
  conversationsList: ReactNode;
  chatView: ReactNode;
  selectedConversation: string | null;
  onBack: () => void;
  headerName?: string;
  headerSubtitle?: string;
  headerAvatarUrl?: string | null;
  isOnline?: boolean;
}

/**
 * Two-screen mobile messenger (client role).
 * - No selection → full-screen conversations list (with its StoriesBar, search, tabs, items).
 * - Selection → sticky mobile chat header (back arrow + avatar + name) + existing chatView
 *   (which already renders offre cards, video, compte-rendu, composer, dialogs).
 * Reuses the existing render logic: nothing is duplicated.
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
}: MobileMessengerProps) {
  useSwipeGesture({
    onSwipeRight: () => {
      if (selectedConversation) onBack();
    },
    threshold: 60,
    edgeThreshold: 40,
  });

  if (!selectedConversation) {
    return (
      <div
        className="imr-chat flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-card"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {conversationsList}
      </div>
    );
  }

  return (
    <div
      className="imr-chat flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden"
      style={{ background: "hsl(160 30% 97%)" }}
    >
      {/* Sticky mobile chat header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 px-2 py-2 border-b border-border/40"
        style={{
          background: "hsl(158 55% 38%)",
          color: "white",
          paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 h-11 w-11 text-white hover:bg-white/15 hover:text-white"
          aria-label="Retour aux conversations"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <ChatAvatar name={headerName || "Agent"} avatarUrl={headerAvatarUrl ?? null} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white">
            {headerName || "Agent"}
          </p>
          {headerSubtitle && (
            <p className="text-[11px] truncate text-white/85">
              {isOnline ? "● En ligne" : headerSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Existing chat view (messages + offre cards + video + composer + dialogs) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {chatView}
      </div>
    </div>
  );
}
