import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, FileText, Image } from 'lucide-react';
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
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Support both controlled and uncontrolled modes
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
    // Envoyer seulement avec Ctrl+Enter (Windows/Linux) ou Cmd+Enter (Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Sinon, Enter seul = retour à la ligne (comportement natif du textarea)
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const isImage = pendingAttachment?.type?.startsWith('image') || pendingAttachment?.type === 'image';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'p-4 border-t backdrop-blur-xl',
        'bg-gradient-to-r from-background/95 via-background/98 to-background/95',
        'transition-all duration-300',
        isFocused && 'shadow-lg shadow-primary/5'
      )}
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="mb-3 p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3 animate-fade-in">
          <div className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center',
            isImage ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
          )}>
            {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
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

      <div className={cn(
        'flex items-end gap-3 p-2 rounded-2xl',
        'bg-muted/50 backdrop-blur-sm',
        'border transition-all duration-300',
        isFocused 
          ? 'border-primary/50 shadow-lg shadow-primary/10 ring-2 ring-primary/20' 
          : 'border-border/50'
      )}>
        {/* Attachment slot - renders the MessageAttachmentUploader */}
        {attachmentSlot}

        {/* Quick replies slot */}
        {quickRepliesSlot}

        {/* Input area */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'min-h-[40px] max-h-[120px] py-2.5 px-4 resize-none',
              'bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/60',
              'text-sm'
            )}
          />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={disabled || (!message.trim() && !pendingAttachment)}
          className={cn(
            'shrink-0 rounded-xl h-10 w-10',
            'bg-gradient-to-r from-primary to-primary/80',
            'hover:from-primary/90 hover:to-primary/70',
            'shadow-lg shadow-primary/30',
            'transition-all duration-300 hover:scale-110 hover:shadow-primary/50',
            'disabled:opacity-50 disabled:hover:scale-100'
          )}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Character count indicator */}
      {message.length > 200 && (
        <div className={cn(
          'text-xs text-right mt-1 transition-colors',
          message.length > 500 ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {message.length}/1000
        </div>
      )}
    </form>
  );
};
