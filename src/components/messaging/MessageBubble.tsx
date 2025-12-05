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
      <div className={cn(
        "flex flex-col max-w-[75%] md:max-w-[60%]",
        "animate-fade-in-scale"
      )}>
        {!isSent && senderName && (
          <span className="text-xs text-muted-foreground mb-1 ml-3 font-medium">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            'relative px-3 py-2 rounded-2xl shadow-sm',
            'transition-all duration-200 hover:shadow-md',
            isSent
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
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
            <p className={cn(
              "text-sm whitespace-pre-wrap break-words",
              isSent ? "text-primary-foreground" : "text-foreground"
            )}>
              {content}
            </p>
          )}

          {/* Timestamp and read status */}
          <div
            className={cn(
              'flex items-center gap-1 mt-1 justify-end',
              isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            <span className="text-[10px]">{formattedTime}</span>
            {isSent && (
              <span className={cn(
                'transition-colors duration-200',
                read ? 'text-blue-300' : 'text-primary-foreground/50'
              )}>
                {read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
