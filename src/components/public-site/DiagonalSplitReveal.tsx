import { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion';

interface DiagonalSplitRevealProps {
  imageSrc: string;
  videoSrc: string;
  title: string;
  scrollHint?: string;
  children?: React.ReactNode;
}

/**
 * Hero "Split Reveal" :
 * - Affiche l'image + titre au chargement
 * - Au scroll, l'image se coupe en diagonale 18° et s'écarte COMPLÈTEMENT
 * - Révèle la vidéo MP4 en boucle muette derrière, avec léger zoom cinéma
 *
 * Desktop/Tablette : scroll-bind progressif (220vh / 180vh de piste)
 * Mobile : one-shot déclenché au premier scroll utilisateur (≥40px)
 */
export function DiagonalSplitReveal({
  imageSrc,
  videoSrc,
  title,
  scrollHint = 'Faites défiler pour découvrir',
  children,
}: DiagonalSplitRevealProps) {
  const expansionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // --- Détection breakpoint ---
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // --- Mobile : déclenchement au scroll utilisateur ---
  const [hasScrolled, setHasScrolled] = useState(false);
  useEffect(() => {
    if (!isMobile) return;
    let triggered = false;
    const onScroll = () => {
      if (!triggered && window.scrollY > 40) {
        triggered = true;
        setHasScrolled(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  // --- Desktop / Tablette : scroll progress ---
  const { scrollYProgress } = useScroll({
    target: expansionRef,
    offset: ['start start', 'end end'],
  });

  // Lissage pour éviter les saccades
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  // Transformations dérivées du scroll — révélation TOTALE (sortie écran)
  const topX = useTransform(smoothProgress, [0, 0.85], ['0vw', '-65vw']);
  const topY = useTransform(smoothProgress, [0, 0.85], ['0vh', '-110vh']);
  const bottomX = useTransform(smoothProgress, [0, 0.85], ['0vw', '65vw']);
  const bottomY = useTransform(smoothProgress, [0, 0.85], ['0vh', '110vh']);
  const titleOpacity = useTransform(smoothProgress, [0, 0.55], [1, 0]);
  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  // Zoom cinéma : démarre zoomé → respire vers 1 → finit légèrement zoomé
  const videoScale = useTransform(smoothProgress, [0, 0.5, 1], [1.12, 1.0, 1.05]);

  // Clip-path pour coupe diagonale ~18°
  // tan(18°) ≈ 0.3249 → décalage ≈ 16.2% en haut/bas
  const TOP_CLIP = 'polygon(0% 0%, 100% 0%, 100% 33.8%, 0% 66.2%)';
  const BOTTOM_CLIP = 'polygon(0% 66.2%, 100% 33.8%, 100% 100%, 0% 100%)';

  // ============================================
  // MODE REDUCED MOTION : vidéo directe, pas d'animation
  // ============================================
  if (prefersReducedMotion) {
    return (
      <div>
        <section className="relative h-screen w-full overflow-hidden bg-[hsl(30_15%_8%)]">
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.35)] via-transparent to-[hsl(30_15%_8%/0.55)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6">
            <h1 className="text-3xl sm:text-5xl font-bold text-[hsl(40_25%_92%)] font-serif text-center max-w-4xl drop-shadow-2xl leading-tight">
              {title}
            </h1>
            <div
              className="mt-3 h-1 rounded-full"
              style={{
                width: '160px',
                background: 'linear-gradient(90deg, transparent, hsl(38 55% 65%), transparent)',
              }}
            />
          </div>
        </section>
        {children}
      </div>
    );
  }

  // ============================================
  // MODE MOBILE : one-shot déclenché au scroll utilisateur
  // ============================================
  if (isMobile) {
    return (
      <div>
        <section className="relative h-screen w-full overflow-hidden bg-[hsl(30_15%_8%)]">
          {/* Vidéo en fond */}
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.35)] via-transparent to-[hsl(30_15%_8%/0.55)]" />

          {/* Moitié haute */}
          <motion.div
            initial={{ x: 0, y: 0 }}
            animate={hasScrolled ? { x: '-60vw', y: '-95vh' } : { x: 0, y: 0 }}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
            style={{ clipPath: TOP_CLIP, WebkitClipPath: TOP_CLIP, willChange: 'transform' }}
            className="absolute inset-0"
          >
            <img src={imageSrc} alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
          </motion.div>

          {/* Moitié basse */}
          <motion.div
            initial={{ x: 0, y: 0 }}
            animate={hasScrolled ? { x: '60vw', y: '95vh' } : { x: 0, y: 0 }}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
            style={{ clipPath: BOTTOM_CLIP, WebkitClipPath: BOTTOM_CLIP, willChange: 'transform' }}
            className="absolute inset-0"
          >
            <img src={imageSrc} alt="" className="w-full h-full object-cover" loading="eager" />
          </motion.div>

          {/* Titre — suit la moitié haute */}
          <motion.div
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={hasScrolled ? { x: '-60vw', y: '-95vh', opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6"
          >
            <h1 className="text-3xl sm:text-5xl font-bold text-[hsl(40_25%_92%)] font-serif text-center max-w-4xl drop-shadow-2xl leading-tight">
              {title}
            </h1>
            <div
              className="mt-3 h-1 rounded-full"
              style={{
                width: '120px',
                background: 'linear-gradient(90deg, transparent, hsl(38 55% 65%), transparent)',
              }}
            />
          </motion.div>

          {/* Scroll hint — visible tant que pas scrollé */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: hasScrolled ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(38_45%_65%)]">{scrollHint}</p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 border-2 border-[hsl(38_45%_48%/0.5)] rounded-full flex justify-center pt-1.5"
            >
              <div className="w-1 h-2.5 rounded-full bg-[hsl(38_55%_65%)]" />
            </motion.div>
          </motion.div>
        </section>
        {children}
      </div>
    );
  }

  // ============================================
  // MODE DESKTOP / TABLETTE : scroll-bind avec révélation totale
  // ============================================
  const trackHeight = isTablet ? '180vh' : '220vh';

  return (
    <div>
      <div ref={expansionRef} style={{ height: trackHeight, position: 'relative' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            background: 'hsl(30 15% 8%)',
          }}
        >
          {/* Vidéo en fond — révélée derrière l'image avec zoom cinéma */}
          <motion.div
            style={{ scale: videoScale, willChange: 'transform' }}
            className="absolute inset-0"
          >
            <video
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.3)] via-transparent to-[hsl(30_15%_8%/0.55)]" />
          </motion.div>

          {/* Moitié haute de l'image (clip + translate hors écran) */}
          <motion.div
            style={{
              x: topX,
              y: topY,
              clipPath: TOP_CLIP,
              WebkitClipPath: TOP_CLIP,
              willChange: 'transform',
            }}
            className="absolute inset-0"
          >
            <img
              src={imageSrc}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </motion.div>

          {/* Moitié basse de l'image (clip + translate hors écran) */}
          <motion.div
            style={{
              x: bottomX,
              y: bottomY,
              clipPath: BOTTOM_CLIP,
              WebkitClipPath: BOTTOM_CLIP,
              willChange: 'transform',
            }}
            className="absolute inset-0"
          >
            <img
              src={imageSrc}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>

          {/* Titre — suit la moitié haute */}
          <motion.div
            style={{ x: topX, y: topY, opacity: titleOpacity }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[hsl(40_25%_92%)] font-serif text-center max-w-4xl drop-shadow-2xl leading-tight">
              {title}
            </h1>
            <div
              className="mt-3 h-1 rounded-full"
              style={{
                width: '160px',
                background: 'linear-gradient(90deg, transparent, hsl(38 55% 65%), transparent)',
              }}
            />
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            style={{ opacity: scrollHintOpacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(38_45%_65%)]">
              {scrollHint}
            </p>
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

      {/* Children apparaissent une fois la piste de scroll dépassée */}
      {children}
    </div>
  );
}
