import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PremiumDossierSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  delay?: number;
  className?: string;
}

export function PremiumDossierSection({
  title,
  icon: Icon,
  children,
  action,
  delay = 0,
  className
}: PremiumDossierSectionProps) {
  return (
    <div 
      className={cn('animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-primary/10 rounded-xl group/icon">
            <Icon className="w-5 h-5 text-primary transition-transform group-hover/icon:scale-110" />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover/icon:opacity-100 transition-opacity" />
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{title}</h2>
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
      
      {/* Section content */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl border border-border/50 shadow-lg group hover:shadow-xl transition-all duration-500">
        {/* Animated gradient border on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 animate-gradient-x" />
          <div className="absolute inset-[1px] rounded-2xl bg-card" />
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float"
              style={{
                left: `${10 + i * 25}%`,
                top: `${20 + (i % 2) * 50}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${4 + i}s`
              }}
            />
          ))}
        </div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
