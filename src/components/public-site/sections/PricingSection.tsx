import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, ShieldCheck, Banknote, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';
import { useSearchType } from '@/contexts/SearchTypeContext';

const columnsLocation = [
  {
    icon: Banknote,
    title: 'Activation',
    value: '300 CHF',
    description: "Acompte unique à l'inscription. Déduit de la commission finale.",
    highlight: false,
  },
  {
    icon: Trophy,
    title: 'Succès',
    value: '1 mois de loyer',
    description: 'Commission uniquement si nous trouvons votre logement. Zéro risque.',
    highlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Garantie',
    value: '90 jours',
    description: 'Si nous ne trouvons rien en 90 jours, vous êtes remboursé intégralement.',
    highlight: false,
  },
];

const columnsAchat = [
  {
    icon: Banknote,
    title: 'Activation',
    value: "2'500 CHF",
    description: "Acompte d'engagement, déduit de la commission finale d'achat.",
    highlight: false,
  },
  {
    icon: Trophy,
    title: 'Succès',
    value: '1% du prix d\'achat',
    description: "Commission uniquement à l'acte authentique. Acompte déduit.",
    highlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Garantie',
    value: '6 mois',
    description: "Pas de bien trouvé en 6 mois ? Acompte intégralement remboursé.",
    highlight: false,
  },
];

export function PricingSection() {
  const { isAchat } = useSearchType();
  const columns = isAchat ? columnsAchat : columnsLocation;
  const subtext = isAchat
    ? 'Sans engagement · Acompte remboursable après 6 mois'
    : 'Sans engagement · Acompte remboursable';

  return (
    <section id="tarifs" className="py-24 md:py-32 bg-background luxury-mesh-bg">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium mb-3">
            Tarifs transparents
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            {isAchat
              ? 'Une commission claire, alignée sur votre succès'
              : 'Un modèle simple et sans surprise'}
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {columns.map((col, i) => (
            <motion.div key={i} variants={staggerItem}>
              <TiltCard intensity={5}>
                <div
                  className={`rounded-2xl p-6 md:p-8 text-center space-y-4 border transition-all duration-500 h-full ${
                    col.highlight
                      ? 'bg-gradient-to-b from-[hsl(38_45%_48%/0.08)] to-[hsl(38_45%_48%/0.03)] border-[hsl(38_45%_48%/0.5)] shadow-lg shadow-[hsl(38_45%_48%/0.1)] luxury-border-pulse'
                      : 'bg-card/50 backdrop-blur-sm border-border/50 hover:border-[hsl(38_45%_48%/0.3)] hover:shadow-md'
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${
                    col.highlight
                      ? 'bg-gradient-to-br from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)]'
                      : 'bg-primary/10'
                  }`}>
                    <col.icon className={`h-7 w-7 ${col.highlight ? 'text-[hsl(40_35%_98%)]' : 'text-primary'}`} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{col.title}</p>
                  <p className={`text-3xl md:text-4xl font-bold font-serif ${col.highlight ? 'luxury-gradient-text' : 'text-foreground'}`}>
                    {col.value}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{col.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        <ScrollReveal variant="fade-up" delay={0.2} className="text-center mt-12">
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
          <p className="text-xs text-muted-foreground mt-3">{subtext}</p>
        </ScrollReveal>

      </div>
    </section>
  );
}
