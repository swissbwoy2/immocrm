import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion';

import { ArrowRight, Smartphone, Zap, UserCheck, Target, Footprints, Send, FolderCheck, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPhoneMockup3D } from '../IPhoneMockup3D';

const SCRUB_DURATION = 10; // seconds
const VIDEO_SRC = '/videos/dashboard-client.mp4';

const FEATURES = [
  { label: 'Agent immobilier personnel', value: 100, icon: UserCheck },
  { label: 'Offres ciblées selon vos critères', value: 100, icon: Target },
  { label: 'Délégations de visite', value: 100, icon: Footprints },
  { label: 'Postulations instantanées', value: 100, icon: Send },
  { label: 'Suivi du dossier', value: 100, icon: FolderCheck },
  { label: 'Analyse de dossier complète', value: 100, icon: FileSearch },
];

export function AppShowcaseSection() {
  const trackRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [isMobile, setIsMobile] = useState(false);
  const [autoplayMode, setAutoplayMode] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const navigate = useNavigate();

  // refs internes pour scrub frame-aligned
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // On mobile/tablet OR reduced motion → autoplay loop (scrub n'est pas fiable sur Safari iOS)
  const useScrub = !isMobile && !prefersReducedMotion;

  // Setup video : autoplay loop sur mobile, préchargement sur desktop
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (!useScrub) {
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.play().then(() => setAutoplayMode(true)).catch(() => {
        const start = () => {
          v.play().then(() => setAutoplayMode(true)).catch(() => {});
        };
        window.addEventListener('touchstart', start, { passive: true, once: true });
        window.addEventListener('pointerdown', start, { once: true });
      });
      return;
    }

    // Desktop scrub : forcer chargement complet et attendre readiness
    v.preload = 'auto';
    v.pause();
    v.load();

    const onReady = () => {
      if (v.readyState >= 3) setVideoReady(true);
    };
    v.addEventListener('loadeddata', onReady);
    v.addEventListener('canplaythrough', onReady);
    onReady();

    // Fallback si la vidéo n'est pas seekable après 3s
    const timeout = window.setTimeout(() => {
      if (v.readyState < 2) {
        v.loop = true;
        v.muted = true;
        v.play().then(() => setAutoplayMode(true)).catch(() => {});
      }
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
      v.removeEventListener('loadeddata', onReady);
      v.removeEventListener('canplaythrough', onReady);
    };
  }, [useScrub]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  // Spring très douce pour glisser sans à-coups (trackpad/molette ProMotion)
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.35,
    restDelta: 0.0005,
  });

  // Boucle rAF : interpole vers la cible, écrit currentTime UNE FOIS par frame
  useEffect(() => {
    if (!useScrub || autoplayMode) return;
    const v = videoRef.current;
    if (!v) return;

    const FRAME_STEP = 1 / 30; // un pas de frame à 30 fps

    const tick = () => {
      const target = targetTimeRef.current;
      // lerp doux vers la cible
      currentTimeRef.current += (target - currentTimeRef.current) * 0.18;
      const next = currentTimeRef.current;
      if (videoReady && Math.abs(v.currentTime - next) >= FRAME_STEP) {
        try {
          v.currentTime = next;
        } catch {
          /* noop */
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [useScrub, autoplayMode, videoReady]);

  useMotionValueEvent(smooth, 'change', (p) => {
    if (!useScrub || autoplayMode) return;
    const v = videoRef.current;
    if (!v) return;
    const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : SCRUB_DURATION;
    targetTimeRef.current = Math.min(SCRUB_DURATION, dur) * Math.max(0, Math.min(1, p));
  });

  return (
    <section
      ref={trackRef}
      id="app-showcase"
      className="relative w-full bg-[hsl(30_15%_6%)]"
      style={{
        // Pas de track étendu sur mobile : section normale qui se scroll naturellement
        height: useScrub ? '220vh' : 'auto',
        minHeight: useScrub ? undefined : '100vh',
      }}
      aria-label="Notre application"
    >
      {/* Sticky inner (desktop only) */}
      <div
        className={
          useScrub
            ? 'sticky top-0 h-screen w-full overflow-hidden'
            : 'relative w-full overflow-hidden py-16 md:py-24'
        }
      >
        {/* Background — doré champagne aligné Hero/Pricing */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 25% 50%, hsl(38 45% 48% / 0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 30%, hsl(28 35% 38% / 0.08), transparent 60%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(30_15%_6%)/0.4] to-[hsl(30_15%_6%)]" />
        </div>

        <div className={`relative z-10 ${useScrub ? 'h-full' : ''} container mx-auto px-4 sm:px-6 flex items-center`}>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            {/* Left: iPhone mockup */}
            <div className="relative flex items-center justify-center order-2 lg:order-1">
              {/* Orbital rings — desktop only */}
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="hidden md:block absolute h-[460px] w-[460px] lg:h-[560px] lg:w-[560px] rounded-full border border-dashed border-[hsl(38_45%_48%/0.18)]"
              />
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                className="hidden md:block absolute h-[540px] w-[540px] lg:h-[660px] lg:w-[660px] rounded-full border border-[hsl(38_45%_48%/0.10)]"
              />
              {/* Pulsing halo — atténué sur mobile */}
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.25, 0.4, 0.25] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute h-[280px] w-[280px] md:h-[400px] md:w-[400px] lg:h-[460px] lg:w-[460px] rounded-full bg-[hsl(38_45%_48%/0.18)] blur-2xl md:blur-3xl"
              />

              {/* Floating iPhone */}
              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [-8, 8, -8] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10"
                style={{ willChange: 'transform' }}
              >
                <div className="scale-[0.78] sm:scale-90 lg:scale-100 origin-center">
                  <IPhoneMockup3D flat={isMobile}>
                    {!videoMissing && (
                      <video
                        ref={videoRef}
                        src={VIDEO_SRC}
                        muted
                        playsInline
                        autoPlay={!useScrub}
                        loop={!useScrub}
                        {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
                        preload={useScrub ? 'auto' : 'metadata'}
                        poster="/app-icon.png"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={() => setVideoMissing(true)}
                      />
                    )}
                    {videoMissing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-[hsl(38_45%_48%/0.15)] via-black to-[hsl(28_35%_38%/0.15)]">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(38_45%_48%)] to-[hsl(28_35%_38%)] flex items-center justify-center mb-4 shadow-2xl">
                          <Smartphone className="h-8 w-8 text-[hsl(40_35%_98%)]" />
                        </div>
                        <p className="text-[hsl(40_35%_98%)]/90 text-sm font-medium">Logisorama</p>
                        <p className="text-[hsl(40_25%_70%)]/70 text-xs mt-1">Tableau de bord client</p>
                      </div>
                    )}

                    {/* Status bar overlay (sous dynamic island) */}
                    <div className="absolute top-[36px] left-0 right-0 z-10 flex justify-between items-center px-6 text-[10px] text-[hsl(40_25%_85%)]/80 font-medium">
                      <span>9:41</span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" /> 5G
                      </span>
                    </div>
                  </IPhoneMockup3D>
                </div>
              </motion.div>

              {/* Live badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[hsl(40_25%_75%)] bg-[hsl(30_15%_8%/0.8)] px-4 py-2 rounded-full border border-[hsl(38_45%_48%/0.3)] backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(38_55%_65%)] animate-pulse" />
                  En direct
                </div>
              </div>
            </div>

            {/* Right: text + CTA */}
            <div className="order-1 lg:order-2 max-w-xl mx-auto lg:mx-0 mt-0 lg:mt-0">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[hsl(38_55%_65%)] mb-3"
              >
                L'application
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(to bottom, hsl(40 35% 98%), hsl(40 25% 65%))',
                }}
              >
                Optimisez vos recherches depuis votre poche
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-base sm:text-lg text-[hsl(40_25%_70%)] mb-8 leading-relaxed"
              >
                Offres, visites, postulations et messagerie ! Tout est synchronisé en temps réel
                avec votre agent immobilier personnel sur votre iPhone, Android ou Web !
              </motion.p>

              {/* Feature bars */}
              <div className="space-y-4 bg-[hsl(30_15%_8%/0.5)] p-5 sm:p-6 rounded-2xl border border-[hsl(38_45%_48%/0.2)] backdrop-blur-sm mb-8">
                {FEATURES.map((feature, idx) => (
                  <div key={feature.label}>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <div className="flex items-center gap-2 text-[hsl(40_25%_85%)]">
                        <feature.icon size={16} className="text-[hsl(38_55%_65%)]" />
                        <span>{feature.label}</span>
                      </div>
                      <span className="font-mono text-xs text-[hsl(40_25%_60%)]">
                        {feature.value}%
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full bg-[hsl(30_15%_12%)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${feature.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, delay: 0.3 + idx * 0.15, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background:
                            'linear-gradient(to right, hsl(38 45% 48%), hsl(38 55% 65%))',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/nouveau-mandat')}
                  className="group h-14 px-8 text-base font-semibold luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 hover:opacity-95 transition-all"
                >
                  Créer mon compte maintenant
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-[hsl(40_25%_60%)]">
                  ✓ Sans engagement &nbsp;·&nbsp; ✓ Activation immédiate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AppShowcaseSection;
