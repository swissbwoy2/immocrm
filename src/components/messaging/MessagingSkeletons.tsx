import React from 'react';
import { cn } from '@/lib/utils';

export const ConversationSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <div 
    style={{ animationDelay: `${index * 100}ms` }}
    className="flex items-center gap-3 p-4 border-b border-border/30 animate-fade-in"
  >
    {/* Avatar skeleton */}
    <div className="relative">
      <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-muted rounded-full animate-pulse" />
    </div>
    
    {/* Content skeleton */}
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
    </div>
  </div>
);

export const MessageSkeleton: React.FC<{ isSent?: boolean; index?: number }> = ({ 
  isSent = false, 
  index = 0 
}) => (
  <div
    style={{ animationDelay: `${index * 80}ms` }}
    className={cn(
      'flex w-full mb-3 animate-fade-in',
      isSent ? 'justify-end' : 'justify-start'
    )}
  >
    <div className={cn(
      'max-w-[60%] space-y-2',
      isSent ? 'items-end' : 'items-start'
    )}>
      {!isSent && (
        <div className="h-3 w-16 bg-muted rounded animate-pulse ml-3" />
      )}
      <div className={cn(
        'rounded-2xl p-4 space-y-2',
        isSent 
          ? 'bg-primary/20 rounded-br-md' 
          : 'bg-muted/50 rounded-bl-md'
      )}>
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="flex justify-end">
          <div className="h-3 w-10 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

export const ConversationListSkeleton: React.FC = () => (
  <div className="space-y-0">
    {[0, 1, 2, 3, 4].map((i) => (
      <ConversationSkeleton key={i} index={i} />
    ))}
  </div>
);

export const MessagesListSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    <MessageSkeleton isSent={false} index={0} />
    <MessageSkeleton isSent={true} index={1} />
    <MessageSkeleton isSent={false} index={2} />
    <MessageSkeleton isSent={true} index={3} />
    <MessageSkeleton isSent={false} index={4} />
  </div>
);
