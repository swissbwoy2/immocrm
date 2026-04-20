import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

const steps = [
  { num: '01', title: 'Vous nous décrivez votre besoin', description: "En 2 minutes, remplissez le formulaire : zone, budget, type de bien, situation personnelle. C'est gratuit et sans engagement." },
  { num: '02', title: 'Votre agent dédié entre en action', description: "Il active son réseau, contacte les régies, filtre les annonces et vous propose uniquement les biens pertinents." },
  { num: '03', title: 'Vous visitez… ou nous visitons pour vous', description: "Quand vous êtes au travail, en vacances ou indisponible, nous visitons pour vous et vous faisons un retour complet. Dossier optimisé, candidature déposée, suivi auprès de la régie — vous n'avez qu'à choisir votre futur logement." },
];

function StepsContent() {
  const { ref, isInView } = useScrollReveal({ threshold: 0.1 });

  return (
    <div ref={ref} className="p-6 md:p-10 space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-6 relative">
          {i < steps.length - 1 && (
            <motion.div
              className="absolute left-6 top-14 bottom-0 w-px"
              style={{ background: 'linear-gradient(to bottom, hsl(38 45% 48% / 0.6), hsl(38 45% 48% / 0.1))' }}
              initial={{ scaleY: 0, transformOrigin: 'top' }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
            />
          )}
          <motion.div
            className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] flex items-center justify-center text-sm font-bold z-10 shadow-[0_0_20px_hsl(38_45%_48%/0.3)]"
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {s.num}
          </motion.div>
          <motion.div
            className="pb-10"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-lg font-bold text-[hsl(40_25%_92%)] mb-2 font-serif">{s.title}</h3>
            <p className="text-sm text-[hsl(40_20%_60%)] leading-relaxed">{s.description}</p>
          </motion.div>
        </div>
      ))}

      <div className="pt-4 flex justify-center">
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
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="bg-background luxury-mesh-bg">
      <ContainerScroll
        titleComponent={
          <div className="space-y-2">
            <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium">
              Comment ça marche
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
              3 étapes simples
            </h2>
            <GoldDivider className="mt-3 max-w-xs mx-auto" />
          </div>
        }
      >
        <StepsContent />
      </ContainerScroll>
    </section>
  );
}
