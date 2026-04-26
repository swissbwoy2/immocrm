import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IPhoneMockup3DProps {
  children?: ReactNode;
  className?: string;
  /** Disable 3D perspective transform (recommended on mobile for perf) */
  flat?: boolean;
}

/**
 * iPhone 15 Pro mockup — pure CSS, no external libs.
 * Children fill the inner screen area.
 */
export function IPhoneMockup3D({ children, className, flat = false }: IPhoneMockup3DProps) {
  return (
    <div
      className={cn(
        'relative mx-auto',
        // Sizes : ~9:19.5 ratio
        'w-[260px] h-[540px] md:w-[280px] md:h-[580px]',
        className,
      )}
      style={
        flat
          ? undefined
          : {
              transform: 'perspective(1400px) rotateY(-8deg) rotateX(2deg)',
              transformStyle: 'preserve-3d',
            }
      }
    >
      {/* Outer glow / shadow — doré champagne aligné charte */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[3.5rem] bg-[hsl(38_45%_48%/0.18)] blur-3xl opacity-70 pointer-events-none"
      />

      {/* Titanium frame */}
      <div
        className="relative h-full w-full rounded-[2.8rem] p-[3px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
        style={{
          background:
            'linear-gradient(145deg, hsl(220 8% 38%) 0%, hsl(220 6% 22%) 35%, hsl(220 8% 12%) 65%, hsl(220 6% 28%) 100%)',
        }}
      >
        {/* Inner bezel (black ring) */}
        <div className="relative h-full w-full rounded-[2.65rem] bg-black p-[6px]">
          {/* Side buttons */}
          <span
            aria-hidden
            className="absolute -left-[3px] top-[110px] h-7 w-[3px] rounded-l-sm"
            style={{ background: 'linear-gradient(to right, hsl(220 8% 18%), hsl(220 8% 30%))' }}
          />
          <span
            aria-hidden
            className="absolute -left-[3px] top-[155px] h-12 w-[3px] rounded-l-sm"
            style={{ background: 'linear-gradient(to right, hsl(220 8% 18%), hsl(220 8% 30%))' }}
          />
          <span
            aria-hidden
            className="absolute -left-[3px] top-[210px] h-12 w-[3px] rounded-l-sm"
            style={{ background: 'linear-gradient(to right, hsl(220 8% 18%), hsl(220 8% 30%))' }}
          />
          <span
            aria-hidden
            className="absolute -right-[3px] top-[170px] h-20 w-[3px] rounded-r-sm"
            style={{ background: 'linear-gradient(to left, hsl(220 8% 18%), hsl(220 8% 30%))' }}
          />

          {/* Screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[2.3rem] bg-black">
            {/* Content */}
            <div className="absolute inset-0">{children}</div>

            {/* Dynamic Island */}
            <div
              aria-hidden
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-[26px] w-[95px] rounded-full bg-black ring-1 ring-black/80 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            />

            {/* Subtle screen glare overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-[2.3rem] opacity-60"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
