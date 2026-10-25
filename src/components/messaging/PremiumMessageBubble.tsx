import React from 'react';
import { LinkifiedText } from './LinkifiedText';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { formatSwissTime } from '@/lib/dateUtils';
import { MessageAttachment } from '@/components/MessageAttachment';
import { isSteeveSender, STEEVE_DISPLAY_NAME } from '@/lib/steeve';

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
  /** messages.sender_type : 'assistant' affiche le nom de Steeve. */
  senderType?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  payload?: MessagePayload | null;
  className?: string;
  index?: number;
}

/**
 * Bulle de message sobre (design de l'app).
 * Envoyé → bulle primary à droite. Reçu → bulle muted à gauche.
 * Les pièces jointes s'affichent en cartes au-dessus du texte, hors de la bulle colorée.
 * API inchangée.
 */
export const PremiumMessageBubble: React.FC<PremiumMessageBubbleProps> = ({
  content,
  isSent,
  timestamp,
  read = false,
  senderName,
  senderType,
  attachmentUrl,
  attachmentName,
  attachmentType,
  attachmentSize,
  payload,
  className,
}) => {
  const formattedTime = formatSwissTime(timestamp);
  const displayedSenderName = isSteeveSender(senderType) ? STEEVE_DISPLAY_NAME : senderName;
  const medias = payload?.medias && payload.medias.length > 0 ? payload.medias : null;
  const hasAttachments = !!attachmentUrl || !!medias;
  const hasText = !!content;

  const meta = (onPrimary: boolean) => (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] leading-none whitespace-nowrap',
        onPrimary ? 'text-primary-foreground/75' : 'text-muted-foreground',
      )}
    >
      <span>{formattedTime}</span>
      {isSent && (
        <span className="inline-flex" aria-label={read ? 'Lu' : 'Envoyé'}>
          {read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </span>
      )}
    </span>
  );

  return (
    <div
      className={cn(
        'flex w-full max-w-full mb-1.5 min-w-0',
        isSent ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] min-w-0',
          isSent ? 'items-end' : 'items-start',
        )}
      >
        {!isSent && displayedSenderName && (
          <span className="text-[11px] text-muted-foreground px-3 font-medium">
            {displayedSenderName}
          </span>
        )}

        {/* Pièces jointes : cartes posées au-dessus de la bulle */}
        {hasAttachments && (
          <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
            {medias && (
              <div className="grid grid-cols-2 gap-1.5 min-w-0">
                {medias.map((media: any, idx) => (
                  <div key={idx} className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card p-1">
                    <MessageAttachment
                      url={media?.url || ''}
                      type={media?.type || media?.mime || 'application/octet-stream'}
                      name={media?.name || 'Fichier joint'}
                      size={media?.size || 0}
                    />
                  </div>
                ))}
              </div>
            )}
            {attachmentUrl && (
              <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/70 bg-card p-1">
                <MessageAttachment
                  url={attachmentUrl}
                  type={attachmentType || 'application/octet-stream'}
                  name={attachmentName || 'Fichier joint'}
                  size={attachmentSize || 0}
                />
              </div>
            )}
            {!hasText && <div className="px-2">{meta(false)}</div>}
          </div>
        )}

        {/* Message sans texte ni pièce jointe : on garde l'heure */}
        {!hasText && !hasAttachments && (
          <div
            className={cn(
              'px-3 py-2 rounded-2xl',
              isSent ? 'rounded-br-md bg-primary' : 'rounded-bl-md bg-muted',
            )}
          >
            {meta(isSent)}
          </div>
        )}

        {/* Texte */}
        {hasText && (
          <div
            className={cn(
              'relative px-3 py-2 text-sm break-words max-w-full min-w-0 overflow-hidden rounded-2xl',
              isSent
                ? 'rounded-br-md bg-primary text-primary-foreground'
                : 'rounded-bl-md bg-muted text-foreground',
            )}
          >
            <p
              className="whitespace-pre-wrap leading-relaxed"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              <LinkifiedText text={content} />
              {/* Réserve la place de l'heure en fin de dernière ligne */}
              <span aria-hidden className={cn('inline-block', isSent ? 'w-12' : 'w-9')} />
            </p>
            <span className="absolute bottom-1.5 right-2.5">{meta(isSent)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
