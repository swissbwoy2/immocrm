import React from 'react';
import { cn } from '@/lib/utils';
import { isUserOnline, formatLastSeen } from '@/hooks/usePresence';

interface OnlineStatusBadgeProps {
  lastSeenAt?: string | null;
  isOnline?: boolean | null;
  showText?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function OnlineStatusBadge({ 
  lastSeenAt, 
  isOnline, 
  showText = true,
  size = 'sm',
  className 
}: OnlineStatusBadgeProps) {
  const online = isUserOnline(lastSeenAt, isOnline);
  const lastSeenText = formatLastSeen(lastSeenAt);

  if (!lastSeenAt && !isOnline) return null;

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span 
        className={cn(
          'rounded-full shrink-0',
          dotSize,
          online 
            ? 'bg-green-500 animate-pulse shadow-sm shadow-green-500/50' 
            : 'bg-muted-foreground/40'
        )} 
      />
      {showText && (
        <span className={cn(textSize, online ? 'text-green-500 font-medium' : 'text-muted-foreground')}>
          {online ? 'En ligne' : lastSeenText}
        </span>
      )}
    </div>
  );
}
