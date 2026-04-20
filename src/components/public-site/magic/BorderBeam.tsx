import { cn } from '@/lib/utils';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  borderWidth = 1.5,
  colorFrom = 'hsl(38 55% 65%)',
  colorTo = 'hsl(28 35% 38%)',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', className)}
      style={{ '--size': size, '--duration': duration, '--border-width': borderWidth, '--color-from': colorFrom, '--color-to': colorTo, '--delay': `-${delay}s` } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: borderWidth,
          background: `conic-gradient(from calc(var(--angle, 0deg)), transparent 0%, ${colorFrom} 10%, ${colorTo} 20%, transparent 30%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: `border-rotate ${duration}s linear infinite`,
          animationDelay: `var(--delay, 0s)`,
        }}
      />
    </div>
  );
}
