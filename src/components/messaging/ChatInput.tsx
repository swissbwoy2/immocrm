import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onAttachmentClick?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onAttachmentClick,
  disabled = false,
  placeholder = 'Écrivez un message...',
  className,
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 p-4 bg-background border-t border-border',
        className
      )}
    >
      {onAttachmentClick && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachmentClick}
          disabled={disabled}
          className="shrink-0 hover:bg-muted"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
      )}

      <div className="flex-1 relative">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="rounded-full bg-muted border-0 pr-4 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <Button
        type="submit"
        size="icon"
        disabled={disabled || !message.trim()}
        className={cn(
          'shrink-0 rounded-full h-10 w-10 transition-all',
          message.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'
        )}
      >
        {message.trim() ? (
          <Send className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
    </form>
  );
};
