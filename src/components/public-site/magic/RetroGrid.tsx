import { cn } from '@/lib/utils';

interface RetroGridProps {
  className?: string;
  angle?: number;
}

export function RetroGrid({ className, angle = 65 }: RetroGridProps) {
  return (
    <div
      className={cn('pointer-events-none absolute size-full overflow-hidden opacity-50', className)}
      style={{ '--grid-angle': `${angle}deg` } as React.CSSProperties}
    >
      <div className="absolute inset-0 [transform:skewY(var(--grid-angle))]">
        <div
          className="absolute h-[300vh] w-[600vw] -ml-[100vw]"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(38 45% 48% / 0.2) 1px, transparent 0), linear-gradient(to bottom, hsl(38 45% 48% / 0.2) 1px, transparent 0)`,
            backgroundSize: '4rem 4rem',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, hsl(38 45% 48% / 0.15), transparent)',
        }}
      />
    </div>
  );
}
