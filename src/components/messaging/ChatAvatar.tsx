import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ChatAvatarProps {
  name: string;
  avatarUrl?: string | null;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 50%)`;
};

export const ChatAvatar: React.FC<ChatAvatarProps> = ({
  name,
  avatarUrl,
  online = false,
  size = 'md',
  className,
}) => {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback 
          style={{ backgroundColor: bgColor }}
          className="text-white font-medium"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-background" />
      )}
    </div>
  );
};
