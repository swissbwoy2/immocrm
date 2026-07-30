import React from 'react';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { formatSwissTime } from '@/lib/dateUtils';
import { MessageAttachment } from '@/components/MessageAttachment';

interface MessagePayload {
  type?: string;
  medias?: Array<{ url: string; type: string; name: string; size: number }>;
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

/**
 * WhatsApp-style message bubble.
 * Outgoing → green-tinted bubble on the right.
 * Incoming → white/dark bubble on the left.
 * API kept identical to the previous "premium" version.
 */
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
}) => {
  const formattedTime = formatSwissTime(timestamp);
  const hasAttachments =
    !!attachmentUrl || (payload?.medias && payload.medias.length > 0);

  return (
    <div
      className={cn(
        'flex w-full max-w-full mb-1.5 min-w-0 animate-wa-bubble',
        isSent ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div className="flex flex-col max-w-[88%] sm:max-w-[75%] md:max-w-[65%] min-w-0">
        {!isSent && senderName && (
          <span className="text-[11px] text-muted-foreground mb-0.5 ml-3 font-medium">
            {senderName}
          </span>
        )}

        <div
          className={cn(
            'relative px-3 py-1.5 text-sm shadow-sm break-words max-w-full min-w-0 overflow-hidden',
            isSent
              ? 'rounded-2xl rounded-br-md bg-[hsl(var(--whatsapp-bubble-out))] text-foreground'
              : 'rounded-2xl rounded-bl-md bg-[hsl(var(--whatsapp-bubble-in))] text-foreground border border-border/40',
          )}
        >
          {/* Multiple medias */}
          {payload?.medias && payload.medias.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2 min-w-0">
              {payload.medias.map((media: any, idx) => (
                <MessageAttachment
                  key={idx}
                  url={media?.url || ''}
                  type={media?.type || media?.mime || 'application/octet-stream'}
                  name={media?.name || 'Fichier joint'}
                  size={media?.size || 0}
                />
              ))}
            </div>
          )}

          {/* Single attachment */}
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

          {/* Text content */}
          {content && (
            <p
              className={cn(
                'whitespace-pre-wrap leading-relaxed',
                hasAttachments ? '' : 'pr-12',
              )}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {content}
            </p>
          )}

          {/* Time + ticks */}
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] leading-none',
              hasAttachments
                ? 'justify-end mt-1'
                : 'absolute bottom-1 right-2',
              isSent ? 'text-foreground/55' : 'text-muted-foreground',
            )}
          >
            <span>{formattedTime}</span>
            {isSent && (
              <span className="inline-flex">
                {read ? (
                  <CheckCheck className="h-3 w-3 text-[hsl(var(--whatsapp-tick))]" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
