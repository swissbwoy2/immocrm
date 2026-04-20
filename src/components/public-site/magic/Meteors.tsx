import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 20, className }: MeteorsProps) {
  const [meteors, setMeteors] = useState<{ id: number; top: string; left: string; delay: string; duration: string }[]>([]);

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }, (_, i) => ({
        id: i,
        top: `${Math.floor(Math.random() * 100)}%`,
        left: `${Math.floor(Math.random() * 100)}%`,
        delay: `${Math.random() * 0.6 + 0.2}s`,
        duration: `${Math.floor(Math.random() * 5 + 3)}s`,
      }))
    );
  }, [number]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute h-px w-[80px] rotate-[215deg] animate-meteor-fall rounded-full"
          style={{
            top: m.top,
            left: m.left,
            animationDelay: m.delay,
            animationDuration: m.duration,
            background: 'linear-gradient(90deg, hsl(38 55% 65%), transparent)',
            boxShadow: '0 0 6px 1px hsl(38 45% 48% / 0.4)',
          }}
        />
      ))}
    </div>
  );
}
