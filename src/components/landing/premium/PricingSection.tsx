import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, ShieldCheck, Banknote, Trophy } from 'lucide-react';

const columns = [
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
    description: "Commission uniquement si nous trouvons votre logement. Zéro risque.",
    highlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Garantie',
    value: '90 jours',
    description: "Si nous ne trouvons rien en 90 jours, vous êtes remboursé intégralement.",
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {columns.map((col, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 md:p-8 text-center space-y-4 border transition-colors ${
                col.highlight
                  ? 'bg-primary/5 border-primary/40 shadow-lg shadow-primary/10'
                  : 'bg-card/50 backdrop-blur-sm border-border/50'
              }`}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
                <col.icon className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{col.title}</p>
              <p className="text-3xl md:text-4xl font-bold text-foreground">{col.value}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{col.description}</p>
            </div>
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
