import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { ChatAvatar } from './ChatAvatar';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  status?: string;
  isArchived?: boolean;
  onBackClick?: () => void;
  onOptionsClick?: () => void;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  avatarUrl,
  status,
  isArchived = false,
  onBackClick,
  onOptionsClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 bg-background border-b border-border',
        className
      )}
    >
      {onBackClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackClick}
          className="md:hidden shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <ChatAvatar name={name} avatarUrl={avatarUrl} size="md" />

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-base text-foreground truncate">
          {name}
        </h2>
        {status && !isArchived && (
          <p className="text-xs text-muted-foreground truncate">
            {status}
          </p>
        )}
        {isArchived && (
          <p className="text-xs text-warning truncate">
            Conversation archivée
          </p>
        )}
      </div>

      {onOptionsClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOptionsClick}
          className="shrink-0"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
