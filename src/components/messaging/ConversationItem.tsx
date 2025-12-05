import React from 'react';
import { cn } from '@/lib/utils';
import { ChatAvatar } from './ChatAvatar';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive } from 'lucide-react';

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
        'w-full flex items-center gap-3 p-3 border-b border-border/50',
        'transition-all duration-200 ease-out',
        'hover:bg-muted/60 hover:translate-x-1',
        'active:scale-[0.99]',
        isSelected && 'bg-primary/10 border-l-2 border-l-primary hover:bg-primary/15',
        isArchived && 'opacity-60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      <div className="relative">
        <ChatAvatar name={name} avatarUrl={avatarUrl} size="md" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full animate-bounce-soft">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={cn(
            "font-semibold text-sm text-foreground truncate",
            unreadCount > 0 && "text-foreground",
            isSelected && "text-primary"
          )}>
            {name}
          </h3>
          {lastMessageTime && (
            <span className={cn(
              "text-[10px] ml-2 shrink-0",
              unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              {formatMessageTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {lastMessage || 'Aucun message'}
          </p>
          {isArchived && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Archive className="h-3 w-3" />
              Archivée
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
