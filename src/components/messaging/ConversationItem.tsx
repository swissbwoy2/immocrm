import React from 'react';
import { cn } from '@/lib/utils';
import { ChatAvatar } from './ChatAvatar';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConversationItemProps {
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  isSelected?: boolean;
  isArchived?: boolean;
  onClick?: () => void;
}

const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: fr });
  }
  
  if (isYesterday(date)) {
    return 'Hier';
  }
  
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

export const ConversationItem: React.FC<ConversationItemProps> = ({
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isSelected = false,
  isArchived = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50',
        isSelected && 'bg-muted/70',
        'focus:outline-none focus:bg-muted/50'
      )}
    >
      <ChatAvatar name={name} avatarUrl={avatarUrl} size="md" />
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {name}
            {isArchived && (
              <span className="ml-2 text-xs text-muted-foreground">(Archivée)</span>
            )}
          </h3>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {formatMessageTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">
            {lastMessage || 'Aucun message'}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
