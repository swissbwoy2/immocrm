import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isUserOnline, formatLastSeen } from '@/hooks/usePresence';
import { ConversationCallControls } from '@/components/calls/ConversationCallControls';
import { SteeveHandoffBar } from '@/components/messaging/SteeveHandoffBar';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';

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
  /** Actions supplémentaires (boutons ronds) affichées avant le menu. Optionnel. */
  actions?: React.ReactNode;
  /** Petite ligne d'info sous le nom, prioritaire sur le statut (ex. « Client ↔ Agent »). Optionnel. */
  subtitle?: React.ReactNode;
  /** Optionnel : affiche le bouton retour à toutes les tailles (vue un panneau à la fois). */
  backAlwaysVisible?: boolean;
}

/**
 * En-tête de conversation sobre : retour (mobile), avatar, nom, statut, actions en icônes rondes.
 * API conservée (ajouts optionnels uniquement).
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  avatarUrl,
  status,
  isArchived = false,
  onBackClick,
  onOptionsClick,
  className,
  lastSeenAt,
  isOnline,
  conversationId,
  actions,
  subtitle,
  backAlwaysVisible = false,
}) => {
  const online = isUserOnline(lastSeenAt, isOnline);
  const hasPresence = !!lastSeenAt || !!isOnline;

  return (
    <>
      <div
        className={cn(
          'flex min-h-[60px] items-center gap-3 px-3 py-2 bg-card border-b border-border/70 md:px-4',
          className,
        )}
      >
        {onBackClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick}
            className={cn('shrink-0 h-10 w-10 -ml-1 rounded-full', !backAlwaysVisible && 'md:hidden')}
            aria-label="Retour aux conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <ChatAvatar name={name || '?'} avatarUrl={avatarUrl} online={online} size="md" />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] text-foreground truncate leading-tight">{name}</h2>
          {isArchived ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">Conversation archivée</p>
          ) : subtitle ? (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          ) : hasPresence ? (
            <p className={cn('text-xs truncate', online ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
              {online ? 'En ligne' : formatLastSeen(lastSeenAt)}
            </p>
          ) : status ? (
            <p className="text-xs text-muted-foreground truncate">{status}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {conversationId && <ConversationCallControls conversationId={conversationId} />}
          {actions}
          {onOptionsClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOptionsClick}
              className="shrink-0 h-9 w-9 rounded-full"
              aria-label="Options de la conversation"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      {/* Qui répond : Steeve ou un humain (invisible tant que Steeve n'est pas activé) */}
      <SteeveHandoffBar conversationId={conversationId} />
    </>
  );
};
