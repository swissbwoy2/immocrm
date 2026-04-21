import { useEffect, useRef, useReducer } from 'react';
import { RetroGrid } from '@/components/public-site/magic/RetroGrid';
import { Meteors } from '@/components/public-site/magic/Meteors';

function useIsMobile() {
  const [mobile, toggle] = useReducer(() => window.innerWidth < 768, typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => toggle();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function useReducedMotion() {
  const [reduced, setReduced] = useReducer(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', setReduced);
    return () => mq.removeEventListener('change', setReduced);
  }, []);
  return reduced;
}

function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.3 - 0.1,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(38, 55%, 65%, ${p.opacity})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) p.y = h + 4;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
      }
      raf = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

function MouseSpotlight() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={spotRef}
      className="fixed pointer-events-none z-0"
      style={{
        width: 600,
        height: 600,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, hsl(38 45% 48% / 0.06) 0%, transparent 70%)',
        transition: 'left 0.1s linear, top 0.1s linear',
      }}
    />
  );
}

export function LuxuryFormBackground() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const animate = !isMobile && !reducedMotion;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Layer 5 — Base gradient anthracite + doré radial */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, hsl(38 45% 48% / 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, hsl(28 35% 35% / 0.06) 0%, transparent 50%),
            hsl(30 15% 8%)
          `,
        }}
      />

      {/* Layer 1 — RetroGrid doré subtle */}
      {animate && (
        <RetroGrid
          className="opacity-[0.03]"
          angle={65}
        />
      )}

      {/* Layer 2 — Particules dorées canvas */}
      {animate && <GoldParticles />}

      {/* Layer 3 — Meteors dorés */}
      {animate && <Meteors number={3} />}

      {/* Layer 4 — Spotlight souris desktop */}
      {animate && <MouseSpotlight />}
    </div>
  );
}
