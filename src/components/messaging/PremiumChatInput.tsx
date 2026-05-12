import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface PremiumChatInputProps {
  onSendMessage: (message: string) => void;
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
 * WhatsApp-style chat input. API preserved.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = controlledMessage !== undefined && onMessageChange !== undefined;
  const message = isControlled ? controlledMessage : internalMessage;
  const setMessage = isControlled ? onMessageChange : setInternalMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || pendingAttachment) && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const isImage =
    pendingAttachment?.type?.startsWith('image') || pendingAttachment?.type === 'image';

  const canSend = !disabled && (!!message.trim() || !!pendingAttachment);

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
              'h-10 w-10 rounded-lg flex items-center justify-center',
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
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Left action slots (attachment + quick replies) inside the rounded pill */}
        <div className="flex-1 flex items-end gap-1 bg-background border border-border/60 rounded-3xl px-2 py-1 focus-within:border-[hsl(var(--whatsapp-green))/0.5] transition-colors">
          {attachmentSlot}
          {quickRepliesSlot}

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 min-h-[40px] max-h-[120px] py-2 px-2 resize-none',
              'bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/60',
              'text-sm',
            )}
          />
        </div>

        {/* WhatsApp-style round green send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className={cn(
            'shrink-0 rounded-full h-11 w-11 text-white shadow-md',
            'bg-[hsl(var(--whatsapp-green))] hover:bg-[hsl(var(--whatsapp-green-dark))]',
            'disabled:opacity-50',
          )}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
