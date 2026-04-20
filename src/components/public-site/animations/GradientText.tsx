import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
}

export function GradientText({ children, className, animated = true, as: Tag = 'span' }: GradientTextProps) {
  return (
    <Tag
      className={cn(
        animated ? 'luxury-gradient-text' : '',
        !animated && 'bg-gradient-to-r from-[hsl(38_55%_70%)] via-[hsl(38_45%_48%)] to-[hsl(28_35%_35%)] bg-clip-text text-transparent',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
