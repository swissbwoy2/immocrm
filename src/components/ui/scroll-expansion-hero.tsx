import { useRef } from 'react';
import { useReducedMotion, useScroll, useTransform, motion } from 'framer-motion';

interface ScrollExpansionHeroProps {
  mediaSrc: string;
  bgImageSrc?: string;
  mediaType?: 'image' | 'video';
  title: string;
  scrollToExpand?: string;
  children?: React.ReactNode;
}

export function ScrollExpansionHero({
  mediaSrc,
  bgImageSrc,
  mediaType = 'image',
  title,
  scrollToExpand = 'Faites défiler pour découvrir',
  children,
}: ScrollExpansionHeroProps) {
  // Ref targets only the 250vh expansion block so scrollYProgress tracks just the expansion
  const expansionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: expansionRef,
    offset: ['start start', 'end end'],
  });

  // Media expansion: 0.6 scale → 1.0 scale over first 50% of scroll
  const scale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [0.6, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [0, 0] : [24, 0]);
  const mediaOpacity = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [0.5, 1]);

  // Title fades out
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3], prefersReducedMotion ? [1, 1] : [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.3], prefersReducedMotion ? [0, 0] : [0, -40]);

  // Scroll indicator fades
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.15], prefersReducedMotion ? [1, 1] : [1, 0]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile || prefersReducedMotion) {
    return (
      <div>
        <section className="relative overflow-hidden">
          {bgImageSrc && (
            <div className="absolute inset-0">
              <img src={bgImageSrc} alt="" className="w-full h-full object-cover" loading="eager" />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.85)] to-[hsl(30_15%_10%/0.95)]" />
            </div>
          )}
          <div className="relative z-10 py-20 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
              {mediaType === 'video' ? (
                <video src={mediaSrc} autoPlay muted loop playsInline className="w-full h-64 object-cover" />
              ) : (
                <img src={mediaSrc} alt={title} className="w-full h-64 object-cover" loading="eager" />
              )}
              {!children && (
                <div className="p-6 bg-[hsl(30_15%_10%)]">
                  <h1 className="text-2xl font-bold text-[hsl(40_25%_92%)] font-serif">{title}</h1>
                </div>
              )}
            </div>
          </div>
        </section>
        {children}
      </div>
    );
  }

  return (
    <div>
      {/* 250vh expansion block — scrollYProgress tracks only this */}
      <div ref={expansionRef} style={{ height: '250vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          {/* Background */}
          {bgImageSrc && (
            <div className="absolute inset-0">
              <img src={bgImageSrc} alt="" className="w-full h-full object-cover" loading="eager" />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.92)] to-[hsl(30_15%_10%/0.98)]" />
            </div>
          )}

          {/* Expanding media */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              style={{
                scale,
                borderRadius,
                opacity: mediaOpacity,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                willChange: 'transform, border-radius, opacity',
              }}
            >
              {mediaType === 'video' ? (
                <video src={mediaSrc} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={mediaSrc} alt={title} className="w-full h-full object-cover" loading="eager" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_15%_8%/0.6)] via-transparent to-transparent" />
            </motion.div>
          </div>

          {/* Title overlay */}
          <motion.div
            style={{ opacity: titleOpacity, y: titleY }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[hsl(40_25%_92%)] font-serif text-center max-w-4xl drop-shadow-2xl leading-tight">
              {title}
            </h1>
            <div
              className="mt-2 h-1 rounded-full"
              style={{
                width: '120px',
                background: 'linear-gradient(90deg, transparent, hsl(38 55% 65%), transparent)',
              }}
            />
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            style={{ opacity: scrollHintOpacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(38_45%_65%)]">{scrollToExpand}</p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 border-2 border-[hsl(38_45%_48%/0.5)] rounded-full flex justify-center pt-1.5"
            >
              <div className="w-1 h-2.5 rounded-full bg-[hsl(38_55%_65%)]" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Children appear naturally once the user scrolls past the 250vh expansion */}
      {children}
    </div>
  );
}
