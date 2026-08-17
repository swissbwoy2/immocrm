import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { LeadAvatar } from '@/components/whatsapp/LeadAvatar';
import { cn } from '@/lib/utils';
import { OnlineStatusBadge } from '@/components/premium/OnlineStatusBadge';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  status?: string;
  isArchived?: boolean;
  onBackClick?: () => void;
  onOptionsClick?: () => void;
  className?: string;
  lastSeenAt?: string | null;
  isOnline?: boolean | null;
  /** Active les boutons d'appel audio / vidéo (room call:{conversationId}) */
  conversationId?: string | null;
}

/**
 * WhatsApp-style chat header. API kept identical.
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  status,
  isArchived = false,
  onBackClick,
  onOptionsClick,
  className,
  lastSeenAt,
  isOnline,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 bg-card border-b border-border/60',
        className,
      )}
    >
      {onBackClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackClick}
          className="md:hidden shrink-0 h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <LeadAvatar name={name} size={40} />

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm text-foreground truncate leading-tight">
          {name}
        </h2>
        {isArchived ? (
          <p className="text-[11px] text-warning truncate">Conversation archivée</p>
        ) : lastSeenAt || isOnline ? (
          <OnlineStatusBadge lastSeenAt={lastSeenAt} isOnline={isOnline} size="sm" />
        ) : status ? (
          <p className="text-[11px] text-muted-foreground truncate">{status}</p>
        ) : null}
      </div>

      {conversationId && <ConversationCallControls conversationId={conversationId} />}

      {onOptionsClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOptionsClick}
          className="shrink-0 h-9 w-9"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
