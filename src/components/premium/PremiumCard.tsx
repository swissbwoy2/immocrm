import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

export function PremiumCard({ 
  children, 
  className, 
  hover = true,
  glow = false,
  delay = 0
}: PremiumCardProps) {
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
