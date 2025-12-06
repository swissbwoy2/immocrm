import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PremiumPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function PremiumPageHeader({ 
  title, 
  subtitle, 
  badge,
  icon: CustomIcon,
  action,
  className 
}: PremiumPageHeaderProps) {
  const Icon = CustomIcon || Sparkles;
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10',
      'p-6 md:p-8 mb-8 animate-fade-in',
      className
    )}>
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-4 right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float" 
          style={{ animationDelay: '0s' }} 
        />
        <div 
          className="absolute bottom-4 left-20 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-float" 
          style={{ animationDelay: '1s' }} 
        />
        <div 
          className="absolute top-1/2 right-1/4 w-16 h-16 bg-primary/5 rounded-full blur-xl animate-float" 
          style={{ animationDelay: '2s' }} 
        />
      </div>
      
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-soft" />
            {badge && (
              <span className="text-xs sm:text-sm font-medium text-primary/80 uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
