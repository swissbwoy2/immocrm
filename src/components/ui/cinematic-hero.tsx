import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CinematicHeroProps {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: string;
  metricValue?: string;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  children?: React.ReactNode;
  id?: string;
}

export function CinematicHero({
  brandName = 'Immo-Rama',
  tagline1 = 'Analyse gratuite',
  tagline2 = 'de ton dossier',
  cardHeading = 'Dossier personnalisé',
  cardDescription = 'Nos experts analysent ton dossier et te proposent la stratégie optimale.',
  metricValue = '500+',
  metricLabel = 'familles accompagnées',
  ctaHeading = 'Commence maintenant',
  ctaDescription = 'Réponse sous 24h. Sans engagement.',
  children,
  id,
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const metricRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768 || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Title chars split animation
      if (titleRef.current) {
        const lines = titleRef.current.querySelectorAll('.cinematic-line');
        gsap.fromTo(lines,
          { y: 80, opacity: 0, rotationX: -45 },
          {
            y: 0, opacity: 1, rotationX: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: titleRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Cards parallax
      if (card1Ref.current) {
        gsap.fromTo(card1Ref.current,
          { x: -60, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: card1Ref.current, start: 'top 85%' },
          }
        );
      }
      if (card2Ref.current) {
        gsap.fromTo(card2Ref.current,
          { x: 60, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.15,
            scrollTrigger: { trigger: card2Ref.current, start: 'top 85%' },
          }
        );
      }

      // Metric counter
      if (metricRef.current) {
        const numEl = metricRef.current.querySelector('.metric-number');
        if (numEl) {
          const target = parseInt(metricValue.replace(/[^0-9]/g, '')) || 500;
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: () => {
              numEl.textContent = Math.round(obj.val).toLocaleString('fr-CH') + (metricValue.includes('+') ? '+' : '');
            },
            scrollTrigger: { trigger: metricRef.current, start: 'top 80%' },
          });
        }
      }
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion, metricValue]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div ref={containerRef} id={id} className="relative overflow-hidden">
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%)] via-[hsl(30_15%_10%)] to-[hsl(30_15%_8%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,hsl(38_45%_48%/0.08),transparent_70%)] pointer-events-none" />

      {/* Horizontal gold lines — cinematic letterbox feel */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        {/* Brand badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(38_45%_48%/0.35)] bg-[hsl(38_45%_48%/0.08)] px-4 py-2 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(38_55%_65%)] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest text-[hsl(38_55%_65%)] uppercase">{brandName}</span>
          </div>
        </div>

        {/* Cinematic title */}
        <div ref={titleRef} className="text-center mb-12 overflow-hidden" style={{ perspective: '800px' }}>
          <div
            className="cinematic-line text-3xl md:text-5xl lg:text-6xl font-bold text-[hsl(40_25%_92%)] font-serif leading-tight"
            style={{ opacity: isMobile ? 1 : 0, transform: isMobile ? 'none' : 'translateY(80px)' }}
          >
            {tagline1}
          </div>
          <div
            className="cinematic-line text-3xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight luxury-gradient-text"
            style={{ opacity: isMobile ? 1 : 0, transform: isMobile ? 'none' : 'translateY(80px)' }}
          >
            {tagline2}
          </div>
        </div>

        {/* 2-card grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {/* Card 1 — main info */}
          <div
            ref={card1Ref}
            className="rounded-2xl bg-[hsl(30_15%_12%/0.9)] border border-[hsl(38_45%_48%/0.2)] p-6 md:p-8 backdrop-blur-sm"
            style={{ opacity: isMobile ? 1 : 0 }}
          >
            <h3 className="text-lg font-bold text-[hsl(40_25%_92%)] mb-3 font-serif">{cardHeading}</h3>
            <p className="text-sm text-[hsl(40_20%_60%)] leading-relaxed mb-6">{cardDescription}</p>
            {children}
          </div>

          {/* Card 2 — metric + CTA */}
          <div
            ref={card2Ref}
            className="rounded-2xl bg-gradient-to-br from-[hsl(38_45%_44%/0.12)] to-[hsl(28_35%_35%/0.08)] border border-[hsl(38_45%_48%/0.3)] p-6 md:p-8 backdrop-blur-sm flex flex-col justify-between"
            style={{ opacity: isMobile ? 1 : 0 }}
          >
            <div ref={metricRef} className="mb-6">
              <div className="metric-number text-5xl md:text-6xl font-bold luxury-gradient-text font-serif">
                {metricValue}
              </div>
              <p className="text-sm text-[hsl(40_20%_60%)] mt-1">{metricLabel}</p>
            </div>
            <div>
              <h4 className="text-base font-bold text-[hsl(40_25%_88%)] mb-2 font-serif">{ctaHeading}</h4>
              <p className="text-sm text-[hsl(40_20%_55%)]">{ctaDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
