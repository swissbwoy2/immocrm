import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, MessageSquare, Search, Home } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { RetroGrid } from '@/components/public-site/magic/RetroGrid';

const steps = [
  {
    num: '01',
    icon: MessageSquare,
    title: 'Vous nous décrivez votre besoin',
    description: "En 2 minutes, remplissez le formulaire : zone, budget, type de bien, situation personnelle. C'est gratuit et sans engagement.",
  },
  {
    num: '02',
    icon: Search,
    title: 'Votre agent dédié entre en action',
    description: "Il active son réseau, contacte les régies, filtre les annonces et vous propose uniquement les biens pertinents.",
  },
  {
    num: '03',
    icon: Home,
    title: 'Vous visitez… ou nous visitons pour vous',
    description: "Quand vous êtes au travail, en vacances ou indisponible, nous visitons pour vous et vous faisons un retour complet. Dossier optimisé, candidature déposée, suivi auprès de la régie — vous n'avez qu'à choisir votre futur logement.",
  },
];

function ConnectorPath({ isInView }: { isInView: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="hidden lg:flex items-center justify-center self-start mt-14 px-1">
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none">
        <motion.path
          d="M 0 14 C 14 14, 14 4, 28 4 C 42 4, 42 24, 56 24"
          stroke="hsl(38 45% 48%)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 0.5 } : {}}
          transition={{ duration: 1.1, delay: 0.7, ease: 'easeInOut' as const }}
        />
        <motion.circle
          cx="56" cy="24" r="3"
          fill="hsl(38 55% 65%)"
          initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 0.65 } : {}}
          transition={{ duration: 0.35, delay: 1.75 }}
        />
      </svg>
    </div>
  );
}

function StepCard({ step, index, isInView }: { step: typeof steps[0]; index: number; isInView: boolean }) {
  const Icon = step.icon;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.18, ease: [0.22, 1, 0.36, 1] as const }}
      className="relative flex flex-col bg-card/60 backdrop-blur-sm border border-[hsl(38_45%_48%/0.18)] rounded-2xl p-7 hover:border-[hsl(38_45%_48%/0.5)] hover:shadow-[0_12px_40px_hsl(38_45%_48%/0.1)] transition-all duration-500 group overflow-hidden h-full"
    >
      {/* Watermark number */}
      <span className="absolute -top-3 right-3 text-9xl font-bold text-[hsl(38_45%_48%/0.07)] select-none pointer-events-none leading-none font-serif">
        {step.num}
      </span>

      {/* Animated icon */}
      <motion.div
        initial={prefersReducedMotion ? false : { rotate: -15, scale: 0.6, opacity: 0 }}
        animate={isInView ? { rotate: 0, scale: 1, opacity: 1 } : {}}
        transition={{ type: 'spring' as const, stiffness: 220, damping: 16, delay: index * 0.18 + 0.28 }}
        className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(38_45%_44%/0.18)] to-[hsl(28_35%_35%/0.12)] border border-[hsl(38_45%_48%/0.35)] flex items-center justify-center mb-5 group-hover:shadow-[0_0_20px_hsl(38_45%_48%/0.25)] transition-shadow duration-300"
      >
        <Icon className="h-7 w-7 text-[hsl(38_55%_65%)]" />
      </motion.div>

      <h3 className="text-lg font-bold text-[hsl(40_25%_92%)] mb-3 font-serif relative z-10 group-hover:text-[hsl(38_45%_58%)] transition-colors duration-300">
        {step.title}
      </h3>
      <p className="text-sm text-[hsl(40_20%_60%)] leading-relaxed relative z-10">{step.description}</p>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.55)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
    </motion.div>
  );
}

function StepsGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 max-w-5xl mx-auto items-start">
      {steps.map((step, i) => (
        <>
          <StepCard key={step.num} step={step} index={i} isInView={isInView} />
          {i < steps.length - 1 && <ConnectorPath key={`conn-${i}`} isInView={isInView} />}
        </>
      ))}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <RetroGrid className="opacity-[0.04]" />

      <div className="container mx-auto px-4 relative z-10">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium mb-3">
            Comment ça marche
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            3 étapes simples
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-14" />
        </ScrollReveal>

        <StepsGrid />

        <ScrollReveal variant="fade-up" delay={0.4} className="flex justify-center mt-14">
          <MagneticButton strength={0.25}>
            <Button
              asChild
              size="lg"
              className="group luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0"
            >
              <Link to="/nouveau-mandat">
                <Rocket className="h-5 w-5 mr-2" />
                Activer ma recherche maintenant
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </MagneticButton>
        </ScrollReveal>

      </div>
    </section>
  );
}
