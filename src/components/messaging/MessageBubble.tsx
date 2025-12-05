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

interface MessageBubbleProps {
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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
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
}) => {
  const formattedTime = format(new Date(timestamp), 'HH:mm', { locale: fr });

  return (
    <div
      className={cn(
        'flex w-full mb-1',
        isSent ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div className="flex flex-col max-w-[75%] md:max-w-[60%]">
        {!isSent && senderName && (
          <span className="text-xs text-muted-foreground mb-1 ml-3">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            'relative px-3 py-2 rounded-lg shadow-sm',
            isSent
              ? 'bg-primary/10 rounded-tr-none message-bubble-sent'
              : 'bg-muted rounded-tl-none message-bubble-received'
          )}
        >
          {/* Triangle queue */}
          <div
            className={cn(
              'absolute top-0 w-0 h-0',
              isSent
                ? 'right-0 -mr-2 border-l-8 border-l-primary/10 border-t-8 border-t-transparent'
                : 'left-0 -ml-2 border-r-8 border-r-muted border-t-8 border-t-transparent'
            )}
          />

          {/* Payload medias (multiple) */}
          {payload?.medias && payload.medias.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
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
            <div className="mb-2">
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
            <p className="text-sm whitespace-pre-wrap break-words">
              {content}
            </p>
          )}

          {/* Timestamp and read status */}
          <div
            className={cn(
              'flex items-center gap-1 mt-1 justify-end',
              isSent ? 'text-primary/60' : 'text-muted-foreground'
            )}
          >
            <span className="text-xs">{formattedTime}</span>
            {isSent && (
              <span className={cn('text-xs', read && 'text-primary')}>
                {read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
