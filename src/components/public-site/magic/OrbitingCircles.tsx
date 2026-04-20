import { cn } from '@/lib/utils';

interface OrbitingCirclesProps {
  className?: string;
  children?: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
}

export function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  delay = 10,
  radius = 100,
  path = true,
  iconSize = 32,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-[hsl(38_45%_48%/0.25)] stroke-[0.5]"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      <div
        className={cn(
          'absolute flex size-full transform-gpu animate-orbit items-center justify-center rounded-full',
          { '[animation-direction:reverse]': reverse },
          className
        )}
        style={
          {
            '--duration': duration,
            '--radius': radius,
            '--delay': -delay,
            animationDuration: `${duration}s`,
            animationDelay: `${-delay}s`,
          } as React.CSSProperties
        }
      >
        <div
          className="flex items-center justify-center rounded-full bg-[hsl(38_45%_48%/0.1)] border border-[hsl(38_45%_48%/0.3)] backdrop-blur-sm"
          style={{ width: iconSize, height: iconSize }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
