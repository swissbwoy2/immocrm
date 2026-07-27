import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface PremiumChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  pendingAttachment?: PendingAttachment | null;
  onRemoveAttachment?: () => void;
  quickRepliesSlot?: React.ReactNode;
  attachmentSlot?: React.ReactNode;
  message?: string;
  onMessageChange?: (message: string) => void;
}

/**
 * WhatsApp-style chat input.
 * - Enter to send, Shift+Enter newline
 * - Auto-growing textarea (1 → ~5 lines)
 * - Always-visible, tap-friendly Send button with spinner while sending
 */
export const PremiumChatInput: React.FC<PremiumChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Écrivez un message...',
  pendingAttachment,
  onRemoveAttachment,
  quickRepliesSlot,
  attachmentSlot,
  message: controlledMessage,
  onMessageChange,
}) => {
  const [internalMessage, setInternalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = controlledMessage !== undefined && onMessageChange !== undefined;
  const message = isControlled ? controlledMessage : internalMessage;
  const setMessage = isControlled ? onMessageChange! : setInternalMessage;

  const canSend = !disabled && !isSending && (!!message.trim() || !!pendingAttachment);

  const doSend = useCallback(async () => {
    if (!canSend) return;
    const value = message.trim();
    try {
      setIsSending(true);
      await Promise.resolve(onSendMessage(value));
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } finally {
      setIsSending(false);
    }
  }, [canSend, message, onSendMessage, setMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = send, Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void doSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [message]);

  const isImage =
    pendingAttachment?.type?.startsWith('image') || pendingAttachment?.type === 'image';

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 py-2 border-t border-border/60 bg-card"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="mb-2 p-2 rounded-xl bg-muted/60 border border-border/50 flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              isImage
                ? 'bg-[hsl(var(--whatsapp-green))/0.12] text-[hsl(var(--whatsapp-green-dark))]'
                : 'bg-primary/10 text-primary',
            )}
          >
            {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pendingAttachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(pendingAttachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemoveAttachment}
            aria-label="Retirer la pièce jointe"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Input pill with left-side action slots + auto-growing textarea */}
        <div className="flex-1 flex items-end gap-1 bg-background border border-border/60 rounded-3xl px-2 py-1 focus-within:border-[hsl(var(--whatsapp-green))/0.5] transition-colors min-w-0">
          {attachmentSlot && <div className="shrink-0 self-end pb-0.5">{attachmentSlot}</div>}
          {quickRepliesSlot && <div className="shrink-0 self-end pb-0.5">{quickRepliesSlot}</div>}

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            aria-label="Écrire un message"
            className={cn(
              'flex-1 min-h-[40px] max-h-[140px] py-2 px-2 resize-none',
              'bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/60',
              'text-sm leading-relaxed',
            )}
          />
        </div>

        {/* Always-visible Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label="Envoyer le message"
          title="Envoyer (Entrée)"
          className={cn(
            'shrink-0 rounded-full h-11 w-11 shadow-md self-end',
            'bg-[hsl(var(--whatsapp-green))] hover:bg-[hsl(var(--whatsapp-green-dark))]',
            'text-white',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'transition-transform active:scale-95',
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};
