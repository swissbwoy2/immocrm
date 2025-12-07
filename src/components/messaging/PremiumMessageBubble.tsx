import React from 'react';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageAttachment } from '@/components/MessageAttachment';

interface MessagePayload {
  type?: string;
  medias?: Array<{url: string, type: string, name: string, size: number}>;
}

interface PremiumMessageBubbleProps {
  content: string;
  isSent: boolean;
  timestamp: string;
  read?: boolean;
  senderName?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  payload?: MessagePayload | null;
  className?: string;
  index?: number;
}

export const PremiumMessageBubble: React.FC<PremiumMessageBubbleProps> = ({
  content,
  isSent,
  timestamp,
  read = false,
  senderName,
  attachmentUrl,
  attachmentName,
  attachmentType,
  attachmentSize,
  payload,
  className,
  index = 0,
}) => {
  const formattedTime = format(new Date(timestamp), 'HH:mm', { locale: fr });

  return (
    <div
      style={{ animationDelay: `${index * 30}ms` }}
      className={cn(
        'flex w-full mb-2',
        isSent ? 'justify-end' : 'justify-start',
        'animate-fade-in',
        className
      )}
    >
      <div className={cn(
        "flex flex-col max-w-[70%] sm:max-w-[75%] md:max-w-[60%]",
        "group overflow-hidden"
      )}>
        {!isSent && senderName && (
          <span className="text-xs text-muted-foreground mb-1 ml-3 font-medium">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            'relative px-4 py-3 rounded-2xl',
            'transition-all duration-300',
            'hover:shadow-xl hover:-translate-y-0.5',
            isSent
              ? [
                  'bg-gradient-to-br from-primary to-primary/90',
                  'text-primary-foreground rounded-br-md',
                  'shadow-lg shadow-primary/20',
                  'hover:shadow-primary/30'
                ]
              : [
                  'bg-gradient-to-br from-muted/80 to-muted',
                  'backdrop-blur-sm',
                  'border border-border/50',
                  'rounded-bl-md',
                  'shadow-md'
                ]
          )}
        >
          {/* Glassmorphism overlay for received messages */}
          {!isSent && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl rounded-bl-md pointer-events-none" />
          )}

          {/* Gradient shine effect on hover */}
          <div className={cn(
            'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            isSent ? 'rounded-br-md' : 'rounded-bl-md',
            'bg-gradient-to-r from-transparent via-white/10 to-transparent',
            'animate-shimmer'
          )} />

          {/* Payload medias (multiple) */}
          {payload?.medias && payload.medias.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
              {payload.medias.map((media, idx) => (
                <MessageAttachment
                  key={idx}
                  url={media.url}
                  type={media.type}
                  name={media.name}
                  size={media.size}
                />
              ))}
            </div>
          )}

          {/* Single Attachment */}
          {attachmentUrl && (
            <div className="mb-2 relative z-10">
              <MessageAttachment
                url={attachmentUrl}
                type={attachmentType || 'application/octet-stream'}
                name={attachmentName || 'Fichier joint'}
                size={attachmentSize || 0}
              />
            </div>
          )}

          {/* Message content */}
          {content && (
            <p className={cn(
              "text-sm whitespace-pre-wrap break-words relative z-10",
              "overflow-hidden overflow-wrap-anywhere",
              isSent ? "text-primary-foreground" : "text-foreground"
            )}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {content}
            </p>
          )}

          {/* Timestamp and read status */}
          <div
            className={cn(
              'flex items-center gap-1.5 mt-2 justify-end relative z-10',
              isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            <span className="text-[10px]">{formattedTime}</span>
            {isSent && (
              <span className={cn(
                'transition-all duration-300',
                read ? 'text-blue-300 scale-110' : 'text-primary-foreground/50'
              )}>
                {read ? (
                  <CheckCheck className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
