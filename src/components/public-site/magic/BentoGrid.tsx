import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  className?: string;
  background?: ReactNode;
  icon?: ReactNode;
  description?: string;
  cta?: string;
  href?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn('grid w-full auto-rows-[22rem] grid-cols-3 gap-4', className)}>
      {children}
    </div>
  );
}

export function BentoCard({ name, className, background, icon, description, cta, href }: BentoCardProps) {
  return (
    <div
      className={cn(
        'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
        'bg-card/80 border border-primary/30 hover:border-primary/30',
        'shadow-sm hover:shadow-md',
        'transition-all duration-500 cursor-pointer',
        '',
        className
      )}
    >
      <div>{background}</div>
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
        <div className="mb-2 text-primary">{icon}</div>
        <h3 className="text-xl font-semibold text-foreground font-serif">{name}</h3>
        <p className="max-w-lg text-muted-foreground text-sm">{description}</p>
      </div>
      {href && (
        <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <a href={href} className="text-sm font-medium text-primary hover:text-primary">
            {cta} →
          </a>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-[hsl(38_45%_48%/0.02)]" />
    </div>
  );
}
