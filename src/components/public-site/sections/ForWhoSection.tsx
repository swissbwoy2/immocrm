import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Target, Compass, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';
import { useSearchType } from '@/contexts/SearchTypeContext';

const profilesLocation = [
  { icon: Clock, title: 'Vous manquez de temps', description: "Entre le travail, la famille et les obligations, vous n'avez pas le temps d'éplucher les annonces et d'appeler les régies." },
  { icon: Target, title: 'Vous ne trouvez rien qui correspond', description: "Les annonces disparaissent en quelques heures. Vous arrivez toujours trop tard ou votre dossier n'est pas retenu." },
  { icon: Compass, title: "Vous venez d'arriver en Suisse", description: "Vous ne connaissez pas encore le marché local, les régies, ni les pratiques. Vous avez besoin d'un guide." },
];

const profilesAchat = [
  { icon: Clock, title: 'Vous manquez de temps', description: "Démarcher banques, visiter, négocier, suivre les notaires : un projet d'achat est un second métier." },
  { icon: Target, title: 'Vous ne trouvez pas le bien idéal', description: "Les bons biens partent en off-market avant même d'être publiés. Vous ratez les meilleures opportunités." },
  { icon: Compass, title: 'Vous voulez le meilleur financement', description: "Comparer les taux hypothécaires de toutes les banques sans vous y noyer : on s'en charge." },
];

export function ForWhoSection() {
  const { isAchat } = useSearchType();
  const profiles = isAchat ? profilesAchat : profilesLocation;

  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium mb-3">Pour qui ?</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            Ce service est fait pour vous si…
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {profiles.map((p, i) => (
            <motion.div key={i} variants={staggerItem}>
              <TiltCard intensity={5}>
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 text-center space-y-4 hover:border-[hsl(38_45%_48%/0.4)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.08)] transition-all duration-500 h-full">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(38_45%_48%/0.12)] to-[hsl(28_35%_35%/0.08)] border border-[hsl(38_45%_48%/0.2)]">
                    <p.icon className="h-7 w-7 text-[hsl(38_45%_48%)]" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-serif">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        <ScrollReveal variant="fade-up" delay={0.3} className="text-center mt-10">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="group border-[hsl(38_45%_48%/0.35)] hover:border-[hsl(38_45%_48%/0.7)] hover:bg-[hsl(38_45%_48%/0.06)] text-[hsl(38_45%_44%)] hover:text-[hsl(38_45%_40%)]"
          >
            <Link to="/nouveau-mandat">
              Activer ma recherche
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </ScrollReveal>

      </div>
    </section>
  );
}
