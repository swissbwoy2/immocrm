import { useRef } from 'react';
import { MapPin, CheckCircle, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { Scene3DWrapper } from '@/components/public-site/3d/Scene3DWrapper';
import { SwissGlobe3D } from '@/components/public-site/3d/SwissGlobe3D';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const cantons = ['Vaud', 'Genève', 'Valais', 'Fribourg', 'Neuchâtel', 'Jura'];

// Pulsing dot overlay on cantons
function PulsingDot({ delay = 0 }: { delay?: number }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-[hsl(38_55%_65%)]"
        animate={prefersReducedMotion ? {} : { scale: [1, 2], opacity: [0.7, 0] }}
        transition={{ duration: 1.6, delay, repeat: Infinity, ease: 'easeOut' as const }}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(38_55%_65%)]" />
    </span>
  );
}

export function CoverageSection() {
  const cantonRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cantonRef, { once: true, amount: 0.2 });

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-muted/20">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">

          {/* Globe 3D */}
          <ScrollReveal variant="slide-right" className="hidden lg:block">
            <div className="relative w-full h-72">
              <Scene3DWrapper
                cameraPosition={[0, 0, 3]}
                fogNear={8}
                fogFar={20}
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <Globe className="h-32 w-32 text-[hsl(38_45%_48%/0.3)]" />
                  </div>
                }
              >
                <SwissGlobe3D />
              </Scene3DWrapper>

              {/* Animated canton labels overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { label: 'GE', top: '55%', left: '18%', delay: 0 },
                  { label: 'VD', top: '38%', left: '38%', delay: 0.3 },
                  { label: 'VS', top: '62%', left: '52%', delay: 0.6 },
                  { label: 'FR', top: '28%', left: '55%', delay: 0.9 },
                  { label: 'NE', top: '20%', left: '62%', delay: 1.2 },
                ].map((dot) => (
                  <motion.div
                    key={dot.label}
                    className="absolute flex flex-col items-center gap-1"
                    style={{ top: dot.top, left: dot.left }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: dot.delay + 0.3, duration: 0.4, type: 'spring' as const }}
                  >
                    <PulsingDot delay={dot.delay} />
                    <span className="text-[9px] font-bold text-[hsl(38_55%_65%)] bg-[hsl(30_15%_8%/0.8)] px-1.5 py-0.5 rounded-full border border-[hsl(38_45%_48%/0.4)]">
                      {dot.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Content */}
          <div ref={cantonRef}>
            <ScrollReveal variant="fade-up" className="mb-4">
              <div className="inline-flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-[hsl(38_45%_48%)]" />
                <span className="text-sm font-semibold text-[hsl(38_45%_48%)] uppercase tracking-wider">Couverture</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4 font-serif">
                Toute la{' '}
                <span className="luxury-gradient-text">Suisse Romande</span>
              </h2>
            </ScrollReveal>

            <GoldDivider className="mb-8" />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="flex flex-wrap gap-3 mb-6"
            >
              {cantons.map((canton, i) => (
                <motion.div key={canton} variants={staggerItem}>
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.55)] hover:bg-[hsl(38_45%_48%/0.06)] hover:shadow-[0_0_12px_hsl(38_45%_48%/0.15)] transition-all duration-300 cursor-default group">
                    <PulsingDot delay={i * 0.25} />
                    <MapPin className="h-3.5 w-3.5 text-[hsl(38_45%_48%)]" />
                    <span className="font-semibold text-foreground text-sm group-hover:text-[hsl(38_45%_58%)] transition-colors">{canton}</span>
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <ScrollReveal variant="fade-up" delay={0.2}>
              <p className="text-muted-foreground mb-6 text-sm">
                +50 agences partenaires • Accès aux offres exclusives
              </p>
              <Button
                asChild
                variant="outline"
                className="group border-[hsl(38_45%_48%/0.35)] hover:border-[hsl(38_45%_48%/0.7)] hover:bg-[hsl(38_45%_48%/0.06)] text-[hsl(38_45%_44%)]"
              >
                <Link to="/nouveau-mandat">
                  Démarre ta recherche
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
