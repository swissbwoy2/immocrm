import React from 'react';
import { cn } from '@/lib/utils';
import { ChatAvatar } from './ChatAvatar';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive, Sparkles } from 'lucide-react';

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

export const PremiumConversationItem: React.FC<PremiumConversationItemProps> = ({
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isSelected = false,
  isArchived = false,
  onClick,
  index = 0,
}) => {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
      className={cn(
        'w-full flex items-center gap-3 p-4 border-b border-border/30',
        'transition-all duration-300 ease-out',
        'hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10',
        'hover:translate-x-2 hover:shadow-lg',
        'active:scale-[0.98]',
        'animate-fade-in opacity-0',
        'group relative overflow-hidden',
        isSelected && 'bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-l-primary shadow-md',
        isArchived && 'opacity-60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      {/* Animated gradient border on hover */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        'bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0',
        'animate-shimmer'
      )} />
      
      {/* Glow effect for unread */}
      {unreadCount > 0 && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
      )}

      <div className="relative z-10">
        <div className="relative">
          <div className={cn(
            'transition-transform duration-300 group-hover:scale-110',
            isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full'
          )}>
            <ChatAvatar name={name} avatarUrl={avatarUrl} size="md" />
          </div>
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5',
              'flex items-center justify-center',
              'bg-gradient-to-r from-primary to-primary/80',
              'text-primary-foreground text-[10px] font-bold rounded-full',
              'shadow-lg shadow-primary/30',
              'animate-bounce-soft'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 text-left relative z-10">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-semibold text-sm truncate transition-colors duration-200",
            unreadCount > 0 && "text-foreground",
            isSelected && "text-primary",
            "group-hover:text-primary"
          )}>
            {name}
          </h3>
          {lastMessageTime && (
            <span className={cn(
              "text-[10px] ml-2 shrink-0 transition-colors duration-200",
              unreadCount > 0 ? "text-primary font-bold" : "text-muted-foreground"
            )}>
              {formatMessageTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate transition-colors duration-200",
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

      {/* Sparkle effect for selected */}
      {isSelected && (
        <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
      )}
    </button>
  );
};
