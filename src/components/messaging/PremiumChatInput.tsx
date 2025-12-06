import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const PremiumChatInput: React.FC<PremiumChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Écrivez un message...',
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'p-4 border-t backdrop-blur-xl',
        'bg-gradient-to-r from-background/95 via-background/98 to-background/95',
        'transition-all duration-300',
        isFocused && 'shadow-lg shadow-primary/5'
      )}
    >
      <div className={cn(
        'flex items-end gap-3 p-2 rounded-2xl',
        'bg-muted/50 backdrop-blur-sm',
        'border transition-all duration-300',
        isFocused 
          ? 'border-primary/50 shadow-lg shadow-primary/10 ring-2 ring-primary/20' 
          : 'border-border/50'
      )}>
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 rounded-xl h-10 w-10',
            'hover:bg-primary/10 hover:text-primary',
            'transition-all duration-200 hover:scale-110'
          )}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

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

        {/* Emoji button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 rounded-xl h-10 w-10',
            'hover:bg-amber-500/10 hover:text-amber-500',
            'transition-all duration-200 hover:scale-110 hover:rotate-12'
          )}
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send/Mic button */}
        {message.trim() ? (
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !message.trim()}
            className={cn(
              'shrink-0 rounded-xl h-10 w-10',
              'bg-gradient-to-r from-primary to-primary/80',
              'hover:from-primary/90 hover:to-primary/70',
              'shadow-lg shadow-primary/30',
              'transition-all duration-300 hover:scale-110 hover:shadow-primary/50',
              'animate-scale-in'
            )}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'shrink-0 rounded-xl h-10 w-10',
              'hover:bg-primary/10 hover:text-primary',
              'transition-all duration-200 hover:scale-110'
            )}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
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
