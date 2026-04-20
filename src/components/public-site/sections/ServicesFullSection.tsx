import { UserCheck, Search, FileCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const deliverables = [
  { icon: UserCheck, title: 'Un agent dédié', description: "Un interlocuteur unique qui connaît votre dossier, votre budget et vos contraintes." },
  { icon: Search, title: 'Recherche active quotidienne', description: "Votre agent contacte les régies, scrute les annonces et active son réseau chaque jour." },
  { icon: FileCheck, title: 'Dossier optimisé', description: "Nous préparons un dossier de candidature complet et professionnel pour maximiser vos chances." },
  { icon: Activity, title: 'Suivi en temps réel', description: "Tableau de bord client avec visibilité sur chaque démarche, chaque offre et chaque retour de régie." },
];

export function ServicesFullSection() {
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

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {deliverables.map((d, i) => (
            <motion.div key={i} variants={staggerItem}>
              <TiltCard intensity={4}>
                <div className="bg-card/50 backdrop-blur-sm border border-[hsl(38_45%_48%/0.15)] rounded-2xl p-8 space-y-3 hover:border-[hsl(38_45%_48%/0.45)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.08)] transition-all duration-500 h-full group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(38_45%_48%/0.12)] to-[hsl(28_35%_35%/0.08)] border border-[hsl(38_45%_48%/0.2)] group-hover:border-[hsl(38_45%_48%/0.5)] group-hover:shadow-[0_0_12px_hsl(38_45%_48%/0.2)] transition-all duration-300">
                    <d.icon className="h-6 w-6 text-[hsl(38_45%_48%)]" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-serif group-hover:text-[hsl(38_45%_44%)] transition-colors">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
