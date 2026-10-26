import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/messaging/ChatAvatar";

interface Props {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  onBack?: () => void;
}

/**
 * Sticky mobile chat header — sobre, aux couleurs de l'app, tap-friendly.
 * Used inside `.imr-chat` scope; desktop keeps its current ChatHeader.
 */
export function MobileConversationHeader({ name, subtitle, avatarUrl, isOnline, onBack }: Props) {
  return (
    <div className="sticky top-0 z-20 lg:hidden flex items-center gap-2 px-2 py-2 bg-card border-b border-border/70">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-10 w-10 rounded-full" aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <ChatAvatar name={name} avatarUrl={avatarUrl} online={isOnline} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate text-foreground">{name}</p>
        {subtitle && (
          <p className={`text-xs truncate ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
