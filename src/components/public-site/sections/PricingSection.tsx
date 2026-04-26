import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { PremiumPricingCard } from '@/components/shared/PremiumPricingCard';
import activationKey from '@/assets/pricing/activation-key.png';
import successContract from '@/assets/pricing/success-contract.png';
import guaranteeShield from '@/assets/pricing/guarantee-shield.png';

const columnsLocation = [
  {
    title: 'Activation',
    value: '300 CHF',
    valueDescription: 'Acompte unique',
    description: "Acompte unique à l'inscription. Déduit de la commission finale.",
    features: ['Sans engagement', 'Remboursable si échec', 'Paiement sécurisé'],
    imageSrc: activationKey,
    imageAlt: 'Clé dorée — symbole de l\'activation',
    highlight: false,
  },
  {
    title: 'Succès',
    value: '1 mois de loyer',
    valueDescription: 'Commission au bail signé',
    description: 'Commission uniquement si nous trouvons votre logement. Zéro risque.',
    features: ['Zéro risque', 'Payable au bail signé', 'Visites incluses'],
    imageSrc: successContract,
    imageAlt: 'Contrat signé avec sceau doré — symbole du succès',
    highlight: true,
  },
  {
    title: 'Garantie',
    value: '90 jours',
    valueDescription: 'Remboursement intégral',
    description: 'Si nous ne trouvons rien en 90 jours, vous êtes remboursé intégralement.',
    features: ['Engagement écrit', 'Remboursement intégral', 'Sans condition'],
    imageSrc: guaranteeShield,
    imageAlt: 'Bouclier doré avec coche — symbole de la garantie',
    highlight: false,
  },
];

const columnsAchat = [
  {
    title: 'Activation',
    value: "2'500 CHF",
    valueDescription: "Acompte d'engagement",
    description: "Acompte d'engagement, déduit de la commission finale d'achat.",
    features: ['Sans engagement', 'Remboursable', 'Mandat exclusif'],
    imageSrc: activationKey,
    imageAlt: 'Clé dorée — symbole de l\'activation',
    highlight: false,
  },
  {
    title: 'Succès',
    value: "1% du prix d'achat",
    valueDescription: "Commission à l'acte",
    description: "Commission uniquement à l'acte authentique. Acompte déduit.",
    features: ['Acompte déduit', "Payable à l'acte", 'Off-market inclus'],
    imageSrc: successContract,
    imageAlt: 'Contrat signé avec sceau doré — symbole du succès',
    highlight: true,
  },
  {
    title: 'Garantie',
    value: '6 mois',
    valueDescription: 'Remboursement intégral',
    description: "Pas de bien trouvé en 6 mois ? Acompte intégralement remboursé.",
    features: ['Engagement écrit', 'Remboursement intégral', 'Sans condition'],
    imageSrc: guaranteeShield,
    imageAlt: 'Bouclier doré avec coche — symbole de la garantie',
    highlight: false,
  },
];

export function PricingSection() {
  const { isAchat } = useSearchType();
  const columns = isAchat ? columnsAchat : columnsLocation;
  const subtext = isAchat
    ? 'Sans engagement · Acompte remboursable après 6 mois'
    : 'Sans engagement · Acompte remboursable après 90 jours';

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
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {columns.map((col, i) => (
            <motion.div key={i} variants={staggerItem} className="h-full">
              <PremiumPricingCard {...col} />
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
