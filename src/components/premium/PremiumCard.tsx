import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
  icon?: React.ElementType;
  title?: string;
  glowColor?: string;
}

export function PremiumCard({ 
  children, 
  className, 
  hover = true,
  glow = false,
  delay = 0,
  icon: Icon,
  title,
  glowColor = "primary"
}: PremiumCardProps) {
  // Si icon et title sont fournis, utiliser le style avec header
  if (Icon && title) {
    return (
      <Card 
        className={cn(
          'group relative bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.15)] hover:border-primary/30 animate-fade-in',
          className
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="group-hover:text-primary transition-colors duration-300">{title}</span>
          </CardTitle>
        </CardHeader>
        {children}
      </Card>
    );
  }

  // Style par défaut sans header
  return (
    <div 
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-card border border-border/50',
        'transition-all duration-500',
        hover && 'hover:shadow-xl hover:-translate-y-1',
        glow && 'hover:shadow-primary/10',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
