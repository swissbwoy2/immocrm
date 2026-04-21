import { useRef } from 'react';
import christPhoto from '@/assets/team/christ-ramazani.png';
import { Badge } from '@/components/ui/badge';
import { Star, MessageCircle, Linkedin, Instagram } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';

export function TeamSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="equipe" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-serif">
            Notre <span className="luxury-gradient-text">équipe</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Des experts passionnés à votre service pour vous accompagner dans tous vos projets immobiliers.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div className="flex justify-center">
          <motion.div
            ref={ref}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] as const }}
            className="relative group"
          >
            {/* Card with BorderBeam */}
            <div className="relative flex flex-col items-center text-center p-10 rounded-2xl bg-card/80 border border-[hsl(38_45%_48%/0.25)] hover:border-[hsl(38_45%_48%/0.55)] hover:shadow-[0_8px_40px_hsl(38_45%_48%/0.15)] transition-all duration-500 overflow-hidden max-w-sm"
              style={{
                perspective: 800,
              }}
            >
              <BorderBeam duration={7} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />

              {/* 3D tilt via framer-motion */}
              <motion.div
                className="w-full flex flex-col items-center"
                whileHover={prefersReducedMotion ? {} : {
                  rotateX: -4,
                  rotateY: 6,
                  scale: 1.02,
                  transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
                }}
              >
                {/* Photo with pulsing gold halo */}
                <div className="relative mb-6">
                  {/* Outer pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={prefersReducedMotion ? {} : {
                      boxShadow: [
                        '0 0 0 0px hsl(38 45% 48% / 0.35)',
                        '0 0 0 12px hsl(38 45% 48% / 0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' as const }}
                  />
                  <div className="relative w-36 h-36 rounded-full overflow-hidden ring-2 ring-[hsl(38_45%_48%/0.45)] ring-offset-2 ring-offset-card shadow-[0_0_24px_hsl(38_45%_48%/0.25)] group-hover:ring-[hsl(38_45%_48%/0.75)] transition-all duration-500">
                    <img src={christPhoto} alt="Christ Ramazani" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-1 font-serif luxury-gradient-text">
                  Christ Ramazani
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-snug">
                  Directeur d'agence – Courtier location et vente
                </p>

                <Badge className="bg-[hsl(38_45%_48%/0.12)] text-[hsl(38_45%_48%)] border border-[hsl(38_45%_48%/0.3)] hover:bg-[hsl(38_45%_48%/0.18)] mb-4">
                  Courtage &amp; Relocation
                </Badge>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                      animate={isInView ? { scale: 1, opacity: 1 } : {}}
                      transition={{ delay: 0.5 + i * 0.08, type: 'spring' as const, stiffness: 300, damping: 18 }}
                    >
                      <Star className="h-4 w-4 fill-[hsl(38_55%_65%)] text-[hsl(38_55%_65%)]" />
                    </motion.div>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">4.8/5</span>
                </div>

                {/* Social badges */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.2)] backdrop-blur-sm hover:border-[hsl(38_45%_48%/0.4)] transition-all cursor-default">
                    <MessageCircle className="h-3.5 w-3.5 text-[hsl(38_45%_55%)]" />
                    <span className="text-xs text-[hsl(40_20%_60%)]">+500 clients</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.2)] backdrop-blur-sm hover:border-[hsl(38_45%_48%/0.4)] transition-all cursor-default">
                    <Star className="h-3.5 w-3.5 text-[hsl(38_45%_55%)]" />
                    <span className="text-xs text-[hsl(40_20%_60%)]">N°1 romand</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
