import React from 'react';
import { cn } from '@/lib/utils';
import { LeadAvatar } from '@/components/whatsapp/LeadAvatar';
import { formatSwissMessageTime } from '@/lib/dateUtils';
import { Archive } from 'lucide-react';
import { isUserOnline } from '@/hooks/usePresence';

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
}

/**
 * WhatsApp-style conversation list item.
 * API kept identical to the previous "premium" version so pages don't need changes.
 */
export const PremiumConversationItem: React.FC<PremiumConversationItemProps> = ({
  name,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isSelected = false,
  isArchived = false,
  onClick,
  lastSeenAt,
  isOnline: isOnlineProp,
}) => {
  const online = isUserOnline(lastSeenAt, isOnlineProp);
  const unread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full max-w-full min-w-0 box-border overflow-hidden text-left px-3 py-2.5 flex items-center gap-3 transition-colors duration-150 min-h-[68px] border-b border-border/40',
        'hover:bg-[hsl(var(--whatsapp-green))/0.08] active:bg-[hsl(var(--whatsapp-green))/0.12]',
        isSelected && 'bg-[hsl(var(--whatsapp-green))/0.10]',
        isArchived && 'opacity-60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--whatsapp-green))/0.4]',
      )}
    >
      <div className="relative shrink-0">
        <LeadAvatar name={name} size={48} />
        {online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--whatsapp-green))] border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0 max-w-full">
          <span
            className={cn(
              'truncate min-w-0 flex-1 text-sm',
              unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
            )}
          >
            {name}
          </span>

          {lastMessageTime && (
            <span
              className={cn(
                'text-[11px] shrink-0',
                unread
                  ? 'text-[hsl(var(--whatsapp-green-dark))] font-semibold'
                  : 'text-muted-foreground',
              )}
            >
              {formatSwissMessageTime(lastMessageTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0 max-w-full">
          <p
            className={cn(
              'truncate min-w-0 flex-1 text-xs',
              unread ? 'text-foreground/80' : 'text-muted-foreground',
            )}
          >
            {lastMessage || 'Aucun message'}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            {isArchived && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Archive className="h-3 w-3" />
                Archivée
              </span>
            )}
            {unread && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[hsl(var(--whatsapp-green))] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
