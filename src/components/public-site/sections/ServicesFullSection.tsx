import { useRef } from 'react';
import { UserCheck, Search, FileCheck, Activity } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { AnimatedBeam } from '@/components/public-site/magic/AnimatedBeam';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const deliverables = [
  { icon: UserCheck, title: 'Un agent dédié', description: "Un interlocuteur unique qui connaît votre dossier, votre budget et vos contraintes." },
  { icon: Search, title: 'Recherche active quotidienne', description: "Votre agent contacte les régies, scrute les annonces et active son réseau chaque jour." },
  { icon: FileCheck, title: 'Dossier optimisé', description: "Nous préparons un dossier de candidature complet et professionnel pour maximiser vos chances." },
  { icon: Activity, title: 'Suivi en temps réel', description: "Tableau de bord client avec visibilité sur chaque démarche, chaque offre et chaque retour de régie." },
];

export function ServicesFullSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const cardRefs = [card0Ref, card1Ref, card2Ref, card3Ref];
  const prefersReducedMotion = useReducedMotion();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <section id="services" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium mb-3">
            Ce que vous obtenez
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            Un accompagnement complet, de A à Z
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div ref={containerRef} className="relative max-w-4xl mx-auto">
          {/* AnimatedBeam connections between cards (desktop only) */}
          {!prefersReducedMotion && !isMobile && (
            <>
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={card0Ref}
                toRef={card1Ref}
                curvature={-30}
                gradientStartColor="hsl(38 55% 65%)"
                gradientStopColor="hsl(28 35% 38%)"
                pathOpacity={0.3}
                duration={4}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={card2Ref}
                toRef={card3Ref}
                curvature={30}
                gradientStartColor="hsl(38 55% 65%)"
                gradientStopColor="hsl(28 35% 38%)"
                pathOpacity={0.3}
                duration={4}
                delay={2}
              />
            </>
          )}

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {deliverables.map((d, i) => (
              <motion.div key={i} variants={staggerItem} ref={cardRefs[i]}>
                <TiltCard intensity={4}>
                  <div className="bg-card/50 backdrop-blur-sm border border-[hsl(38_45%_48%/0.15)] rounded-2xl p-8 space-y-3 hover:border-[hsl(38_45%_48%/0.45)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.08)] transition-all duration-500 h-full group">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(38_45%_48%/0.15)] to-[hsl(28_35%_35%/0.1)] border border-[hsl(38_45%_48%/0.25)] group-hover:border-[hsl(38_45%_48%/0.55)] group-hover:shadow-[0_0_16px_hsl(38_45%_48%/0.22)] transition-all duration-300">
                      <d.icon className="h-7 w-7 text-[hsl(38_45%_48%)]" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground font-serif group-hover:text-[hsl(38_45%_44%)] transition-colors">{d.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
