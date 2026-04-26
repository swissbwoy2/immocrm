import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion';
import { ArrowRight, Smartphone, Bell, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPhoneMockup3D } from '../IPhoneMockup3D';

const SCRUB_DURATION = 10; // seconds
const VIDEO_SRC = '/videos/dashboard-client.mp4';

const FEATURES = [
  { label: 'Mandats actifs', value: 100, icon: Smartphone },
  { label: 'Notifications instantanées', value: 98, icon: Bell },
  { label: 'Sécurité bancaire', value: 100, icon: Lock },
];

export function AppShowcaseSection() {
  const trackRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [isMobile, setIsMobile] = useState(false);
  const [fallbackAutoplay, setFallbackAutoplay] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // iOS unlock + fallback
  useEffect(() => {
    if (prefersReducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    let unlocked = false;

    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;
      try {
        v.muted = true;
        const p = v.play();
        if (p) await p;
        v.pause();
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    };

    const onTouch = () => unlock();
    const onScroll = () => unlock();

    window.addEventListener('touchstart', onTouch, { passive: true, once: true });
    window.addEventListener('pointerdown', onTouch, { once: true });
    window.addEventListener('scroll', onScroll, { passive: true, once: true });

    const timeout = window.setTimeout(() => {
      if (v.readyState < 2) {
        // can't seek → autoplay loop fallback
        v.loop = true;
        v.muted = true;
        v.play().then(() => setFallbackAutoplay(true)).catch(() => {});
      }
    }, 1500);

    return () => {
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('pointerdown', onTouch);
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timeout);
    };
  }, [prefersReducedMotion]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.4 });

  useMotionValueEvent(smooth, 'change', (p) => {
    const v = videoRef.current;
    if (!v || fallbackAutoplay || prefersReducedMotion) return;
    const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : SCRUB_DURATION;
    const target = Math.min(SCRUB_DURATION, dur) * Math.max(0, Math.min(1, p));
    try {
      v.currentTime = target;
    } catch {
      /* noop */
    }
  });

  return (
    <section
      ref={trackRef}
      id="app-showcase"
      className="relative w-full bg-[hsl(var(--background))]"
      style={{ height: isMobile ? '160vh' : '200vh' }}
      aria-label="Notre application"
    >
      {/* Sticky inner */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Background radial gradient (gold) */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 25% 50%, hsl(45 100% 50% / 0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 30%, hsl(38 80% 45% / 0.08), transparent 60%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="relative z-10 h-full container mx-auto px-4 sm:px-6 flex items-center">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
            {/* Left: iPhone mockup */}
            <div className="relative flex items-center justify-center order-2 lg:order-1">
              {/* Orbital rings */}
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute h-[440px] w-[440px] md:h-[560px] md:w-[560px] rounded-full border border-dashed border-[hsl(45_100%_50%/0.18)]"
              />
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                className="absolute h-[520px] w-[520px] md:h-[660px] md:w-[660px] rounded-full border border-[hsl(45_100%_50%/0.08)]"
              />
              {/* Pulsing halo */}
              <motion.div
                aria-hidden
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute h-[360px] w-[360px] md:h-[460px] md:w-[460px] rounded-full bg-[hsl(45_100%_50%/0.25)] blur-3xl"
              />

              {/* Floating iPhone */}
              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [-8, 8, -8] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10"
              >
                <IPhoneMockup3D flat={isMobile}>
                  {!videoMissing && (
                    <video
                      ref={videoRef}
                      src={VIDEO_SRC}
                      muted
                      playsInline
                      // @ts-expect-error iOS attr
                      webkit-playsinline="true"
                      preload="metadata"
                      poster="/app-icon.png"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={() => setVideoMissing(true)}
                    />
                  )}
                  {/* Placeholder if video missing */}
                  {videoMissing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-[hsl(45_100%_50%/0.15)] via-black to-[hsl(38_80%_35%/0.15)]">
                      <div className="h-16 w-16 rounded-2xl bg-[hsl(45_100%_50%)] flex items-center justify-center mb-4 shadow-2xl">
                        <Smartphone className="h-8 w-8 text-black" />
                      </div>
                      <p className="text-white/90 text-sm font-medium">Logisorama</p>
                      <p className="text-white/50 text-xs mt-1">Tableau de bord client</p>
                    </div>
                  )}

                  {/* Status notch overlay (under dynamic island) */}
                  <div className="absolute top-[36px] left-0 right-0 z-10 flex justify-between items-center px-6 text-[10px] text-white/80 font-medium">
                    <span>9:41</span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" /> 5G
                    </span>
                  </div>
                </IPhoneMockup3D>
              </motion.div>

              {/* Live badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/70 bg-background/80 px-4 py-2 rounded-full border border-border backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(45_100%_50%)] animate-pulse" />
                  En direct
                </div>
              </div>
            </div>

            {/* Right: text + CTA */}
            <div className="order-1 lg:order-2 max-w-xl mx-auto lg:mx-0">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[hsl(45_100%_50%)] mb-3"
              >
                L'application
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50"
              >
                Pilotez toute votre recherche depuis votre poche
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed"
              >
                Mandats, visites, documents et messagerie — tout est synchronisé en temps réel
                sur iPhone, Android et web.
              </motion.p>

              {/* Feature bars */}
              <div className="space-y-5 bg-card/40 p-5 sm:p-6 rounded-2xl border border-border backdrop-blur-sm mb-8">
                {FEATURES.map((feature, idx) => (
                  <div key={feature.label}>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground/90">
                        <feature.icon size={16} className="text-[hsl(45_100%_50%)]" />
                        <span>{feature.label}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {feature.value}%
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${feature.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, delay: 0.3 + idx * 0.15, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(45_100%_50%)] to-[hsl(38_85%_55%)] rounded-full"
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
                  className="group h-14 px-8 text-base font-semibold bg-gradient-to-r from-[hsl(45_100%_50%)] to-[hsl(38_85%_55%)] text-black hover:opacity-90 hover:shadow-[0_10px_40px_-10px_hsl(45_100%_50%/0.6)] transition-all"
                >
                  Créer mon compte maintenant
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-muted-foreground">
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
