import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from 'framer-motion';

interface DiagonalSplitRevealProps {
  imageSrc: string;
  videoSrc: string;
  title: string;
  scrollHint?: string;
  children?: React.ReactNode;
}

const SCRUB_DURATION = 10; // secondes de vidéo balayées

/**
 * Hero "Split Reveal" — version unifiée desktop / mobile.
 *
 * - Image + titre au chargement, vidéo figée sur frame 0 derrière.
 * - Au scroll, l'image se split en diagonale 18° ET la vidéo avance frame par frame.
 * - Plage de scrub : 0 → 10s. À la fin, la vidéo reste figée sur la dernière frame.
 *
 * Mobile : amorçage iOS (play→pause au 1er touch/scroll) pour débloquer le seek,
 * piste de scroll plus courte (140vh), fallback autoplay loop si la vidéo
 * n'arrive pas à devenir seekable.
 */
export function DiagonalSplitReveal({
  imageSrc,
  videoSrc,
  title,
  scrollHint = 'Faites défiler pour découvrir',
  children,
}: DiagonalSplitRevealProps) {
  const expansionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedVideoRef = useRef<HTMLVideoElement>(null);
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

  // --- Amorçage vidéo (iOS Safari surtout) ---
  // Sans un play() lancé depuis un geste utilisateur, iOS ignore tous les
  // appels à `currentTime = X`. On débloque au 1er touchstart/scroll, puis
  // on bascule en pause pour reprendre la main.
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [fallbackAutoplay, setFallbackAutoplay] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let unlocked = false;

    const unlock = async () => {
      if (unlocked) return;
      const v = videoRef.current;
      if (!v) return;
      unlocked = true;

      try {
        v.muted = true;
        // Joue brièvement pour satisfaire la policy iOS, puis pause immédiat
        const playPromise = v.play();
        if (playPromise) await playPromise;
        v.pause();
        v.currentTime = 0;
        setVideoUnlocked(true);
      } catch {
        // Si play() est rejeté (rare hors iOS strict), on bascule en fallback
        setFallbackAutoplay(true);
      }

      // Fallback : si après 1s la vidéo n'est toujours pas seekable,
      // on lance autoplay+loop pour ne jamais rester sur fond brun.
      window.setTimeout(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (vid.readyState < 2) {
          vid.loop = true;
          vid.play().catch(() => {});
          setFallbackAutoplay(true);
        }
      }, 1000);

      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('scroll', unlock);
      window.removeEventListener('pointerdown', unlock);
    };

    window.addEventListener('touchstart', unlock, { passive: true, once: false });
    window.addEventListener('pointerdown', unlock, { passive: true, once: false });
    window.addEventListener('scroll', unlock, { passive: true, once: false });

    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('scroll', unlock);
    };
  }, [prefersReducedMotion]);

  // --- Scroll progress (desktop, tablette, mobile : tous les mêmes hooks) ---
  const { scrollYProgress } = useScroll({
    target: expansionRef,
    offset: ['start start', 'end end'],
  });

  // Lissage premium pour scroll buttery-smooth
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 22,
    mass: 0.6,
    restDelta: 0.0005,
  });

  // Transformations dérivées du scroll — révélation TOTALE (sortie écran)
  const topX = useTransform(smoothProgress, [0, 0.85], ['0vw', '-65vw']);
  const topY = useTransform(smoothProgress, [0, 0.85], ['0vh', '-110vh']);
  const bottomX = useTransform(smoothProgress, [0, 0.85], ['0vw', '65vw']);
  const bottomY = useTransform(smoothProgress, [0, 0.85], ['0vh', '110vh']);
  const titleOpacity = useTransform(smoothProgress, [0, 0.55], [1, 0]);
  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const videoScale = useTransform(smoothProgress, [0, 0.5, 1], [1.12, 1.0, 1.05]);

  // --- Scrub vidéo ultra fluide : rAF + lerp + seek throttlé ---
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // 1) On ne fait que stocker la cible dans le motion event (pas de seek direct)
  useMotionValueEvent(smoothProgress, 'change', (p) => {
    if (fallbackAutoplay) return;
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    const max = Math.min(SCRUB_DURATION, v.duration);
    targetTimeRef.current = Math.max(0, Math.min(p, 1)) * max;
  });

  // 2) Boucle rAF : interpole vers la cible et seek 1× par frame max
  useEffect(() => {
    if (prefersReducedMotion) return;
    const SEEK_THRESHOLD = 0.04; // s
    const LERP = 0.22;

    const tick = () => {
      const v = videoRef.current;
      if (v && !fallbackAutoplay) {
        // lerp doux vers la cible
        currentTimeRef.current += (targetTimeRef.current - currentTimeRef.current) * LERP;
        const next = currentTimeRef.current;
        if (
          v.readyState >= 2 &&
          Math.abs(v.currentTime - next) >= SEEK_THRESHOLD
        ) {
          try {
            v.currentTime = next;
          } catch {
            /* noop */
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fallbackAutoplay, prefersReducedMotion]);


  // Préparer la vidéo une fois les métadonnées chargées
  const handleLoadedMetadata = (
    ref: React.RefObject<HTMLVideoElement>,
    initialTime: number,
  ) => () => {
    const v = ref.current;
    if (!v) return;
    try {
      v.pause();
      v.currentTime = initialTime;
    } catch {
      /* noop */
    }
  };

  // Clip-path pour coupe diagonale ~18°
  const TOP_CLIP = 'polygon(0% 0%, 100% 0%, 100% 33.8%, 0% 66.2%)';
  const BOTTOM_CLIP = 'polygon(0% 66.2%, 100% 33.8%, 100% 100%, 0% 100%)';

  // ============================================
  // MODE REDUCED MOTION : vidéo figée sur la frame finale (7s)
  // ============================================
  if (prefersReducedMotion) {
    return (
      <div>
        <section className="relative h-screen w-full overflow-hidden bg-[hsl(30_15%_8%)]">
          <video
            ref={reducedVideoRef}
            src={videoSrc}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata(reducedVideoRef, SCRUB_DURATION)}
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
  // MODE UNIFIÉ : desktop / tablette / mobile — même scrub scroll-driven
  // ============================================
  // Piste de scroll : plus courte sur mobile/tablette pour préserver la perf
  // et permettre une révélation rapide au pouce.
  const trackHeight = isMobile ? '340vh' : isTablet ? '360vh' : '380vh';

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
          {/* Vidéo en fond — scrubée 0→7s par le scroll, avec zoom cinéma */}
          <motion.div
            style={{ scale: videoScale, willChange: 'transform' }}
            className="absolute inset-0"
          >
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as Record<string, string>)}
              preload={isMobile ? 'metadata' : 'auto'}
              autoPlay={fallbackAutoplay}
              loop={fallbackAutoplay}
              onLoadedMetadata={handleLoadedMetadata(videoRef, 0)}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.3)] via-transparent to-[hsl(30_15%_8%/0.55)]" />
          </motion.div>

          {/* Moitié haute de l'image */}
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

          {/* Moitié basse de l'image */}
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
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[hsl(40_25%_92%)] font-serif text-center max-w-4xl drop-shadow-2xl leading-tight">
              {title}
            </h1>
            <div
              className="mt-3 h-1 rounded-full"
              style={{
                width: isMobile ? '120px' : '160px',
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

      {children}
    </div>
  );
}
