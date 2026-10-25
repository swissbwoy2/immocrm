import React from 'react';
import { cn } from '@/lib/utils';
import { formatSwissMessageTime } from '@/lib/dateUtils';
import { Archive, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { isUserOnline } from '@/hooks/usePresence';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';

/** Canal d'une conversation, affiché en petite icône sur l'avatar. */
export type ConversationChannel = 'app' | 'whatsapp' | 'email' | 'sms';

const CHANNEL_META: Record<ConversationChannel, { icon: React.ElementType; label: string; cls: string }> = {
  app: { icon: MessageCircle, label: 'Messagerie', cls: 'bg-primary text-primary-foreground' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', cls: 'bg-emerald-600 text-white' },
  email: { icon: Mail, label: 'E-mail', cls: 'bg-foreground text-background' },
  sms: { icon: Smartphone, label: 'SMS', cls: 'bg-foreground text-background' },
};

interface PremiumConversationItemProps {
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  isSelected?: boolean;
  isArchived?: boolean;
  onClick?: () => void;
  index?: number;
  lastSeenAt?: string | null;
  isOnline?: boolean | null;
  /** Optionnel : canal affiché en petite icône sur l'avatar (WhatsApp, e-mail…). */
  channel?: ConversationChannel;
  /** Optionnel : icône de type à la place du canal (ex. agent, propriétaire). */
  channelIcon?: React.ElementType;
  /** Optionnel : libellé accessible de l'icône de type. */
  channelLabel?: string;
  /** Optionnel : petite ligne sous le nom (ex. « Agent : Marie Dupont »). */
  subtitle?: React.ReactNode;
  /** Optionnel : pastille supplémentaire à droite de l'aperçu (ex. statut). */
  badge?: React.ReactNode;
}

/**
 * Élément de liste de conversations sobre :
 * avatar (+ présence et canal), nom, heure relative, aperçu sur 1-2 lignes, badge non lu.
 * API conservée (ajouts optionnels uniquement).
 */
export const PremiumConversationItem: React.FC<PremiumConversationItemProps> = ({
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isSelected = false,
  isArchived = false,
  onClick,
  lastSeenAt,
  isOnline: isOnlineProp,
  channel,
  channelIcon,
  channelLabel,
  subtitle,
  badge,
}) => {
  const online = isUserOnline(lastSeenAt, isOnlineProp);
  const unread = unreadCount > 0;
  const meta = channel ? CHANNEL_META[channel] : null;
  const ChannelIcon = channelIcon ?? meta?.icon;
  const channelCls = channelIcon ? 'bg-muted text-foreground' : meta?.cls;
  const channelText = channelLabel ?? meta?.label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'relative w-full max-w-full min-w-0 box-border overflow-hidden text-left px-3 py-3 flex items-start gap-3 min-h-[72px]',
        'transition-colors duration-150 rounded-xl',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/60 active:bg-muted',
        isArchived && !isSelected && 'opacity-60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      )}
    >
      {isSelected && <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />}

      <div className="relative shrink-0">
        <ChatAvatar name={name || '?'} avatarUrl={avatarUrl} online={online} size="lg" />
        {ChannelIcon && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-card',
              channelCls,
            )}
            title={channelText}
            aria-label={channelText}
          >
            <ChannelIcon className="h-2.5 w-2.5" aria-hidden />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <div className="flex items-baseline justify-between gap-2 min-w-0 max-w-full">
          <span
            className={cn(
              'truncate min-w-0 flex-1 text-[15px] leading-tight',
              unread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
            )}
          >
            {name}
          </span>
          {lastMessageTime && (
            <span
              className={cn(
                'text-xs shrink-0',
                unread ? 'text-primary font-semibold' : 'text-muted-foreground',
              )}
            >
              {formatSwissMessageTime(lastMessageTime)}
            </span>
          )}
        </div>

        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}

        <div className="flex items-start justify-between gap-2 mt-0.5 min-w-0 max-w-full">
          <p
            className={cn(
              'min-w-0 flex-1 text-sm leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]',
              unread ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {lastMessage || 'Aucun message'}
          </p>

          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {badge}
            {isArchived && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                <Archive className="h-3 w-3" />
                Archivée
              </span>
            )}
            {unread && (
              <span
                className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center"
                aria-label={`${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
