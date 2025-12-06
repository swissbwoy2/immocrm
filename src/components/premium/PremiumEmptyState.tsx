import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PremiumEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PremiumEmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  className 
}: PremiumEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4',
      'animate-fade-in',
      className
    )}>
      <div className="relative mb-6">
        {/* Glow effect behind icon */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-soft" />
        
        <div className="relative p-4 rounded-full bg-muted/50 border border-border/50">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {action}
        </div>
      )}
    </div>
  );
}
