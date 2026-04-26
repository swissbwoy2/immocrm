import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight } from 'lucide-react';
import { PremiumPricingCard } from '@/components/shared/PremiumPricingCard';
import activationKey from '@/assets/pricing/activation-key.png';
import successContract from '@/assets/pricing/success-contract.png';
import guaranteeShield from '@/assets/pricing/guarantee-shield.png';

const columns = [
  {
    title: 'Activation',
    value: '300 CHF',
    valueDescription: 'Acompte unique',
    description: "Acompte unique à l'inscription. Déduit de la commission finale.",
    features: ['Sans engagement', 'Remboursable si échec', 'Paiement sécurisé'],
    imageSrc: activationKey,
    imageAlt: "Clé dorée — symbole de l'activation",
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

export function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
            Tarifs transparents
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Un modèle simple et sans surprise
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {columns.map((col, i) => (
            <PremiumPricingCard key={i} {...col} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild size="lg" className="group shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90">
            <Link to="/nouveau-mandat">
              <Rocket className="h-5 w-5 mr-2" />
              Activer ma recherche maintenant
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Sans engagement · Acompte remboursable</p>
        </div>
      </div>
    </section>
  );
}
