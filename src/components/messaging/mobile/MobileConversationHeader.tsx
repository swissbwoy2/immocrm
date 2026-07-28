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
 * Sticky mobile chat header — small, Immo-green tinted, tap-friendly.
 * Used inside `.imr-chat` scope; desktop keeps its current ChatHeader.
 */
export function MobileConversationHeader({ name, subtitle, avatarUrl, isOnline, onBack }: Props) {
  return (
    <div className="sticky top-0 z-20 lg:hidden flex items-center gap-2 px-2 py-2 bg-white/95 backdrop-blur border-b border-border/40">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-10 w-10" aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <ChatAvatar name={name} avatarUrl={avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "hsl(200 35% 18%)" }}>{name}</p>
        {subtitle && (
          <p className="text-[11px] truncate" style={{ color: isOnline ? "hsl(158 55% 38%)" : "hsl(200 20% 45%)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
