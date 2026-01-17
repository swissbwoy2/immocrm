import { Check, X, ArrowRight } from 'lucide-react';

const comparisonData = [
  {
    criteria: 'Commission vendeur',
    immorama: '0% GRATUIT',
    classique: '2-4%',
    highlight: true,
  },
  {
    criteria: 'Vous gardez',
    immorama: '100% de votre prix',
    classique: '96-98%',
    highlight: true,
  },
  {
    criteria: 'Mode de vente',
    immorama: 'Off-market discret',
    classique: 'Annonces publiques',
    highlight: false,
  },
  {
    criteria: 'Profil acheteurs',
    immorama: 'Qualifiés et prêts',
    classique: 'Curieux du dimanche',
    highlight: false,
  },
  {
    criteria: 'Négociation prix',
    immorama: 'Prix fixe respecté',
    classique: 'Pression à la baisse',
    highlight: false,
  },
  {
    criteria: 'Délai de vente',
    immorama: 'Quelques semaines',
    classique: 'Plusieurs mois',
    highlight: false,
  },
  {
    criteria: 'Optimisation fiscale',
    immorama: 'Conseils impôt gain immobilier',
    classique: 'Aucun accompagnement',
    highlight: true,
  },
  {
    criteria: 'Visites',
    immorama: 'Ciblées et qualifiées',
    classique: 'Nombreuses et aléatoires',
    highlight: false,
  },
];

export function VendeurDifferentiationSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pas une agence
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              comme les autres
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Nous ne vendons pas votre bien. Nous le présentons à des acheteurs qualifiés 
            et prêts à passer à l'action. Découvrez la différence.
          </p>
        </div>

        {/* Comparison table - Desktop */}
        <div className="max-w-5xl mx-auto hidden md:block">
          <div className="rounded-3xl overflow-hidden border border-border/50 bg-card">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/50">
              <div className="p-6 border-r border-border/50">
                <p className="font-medium text-muted-foreground">Critère</p>
              </div>
              <div className="p-6 border-r border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-lg">Immo-rama.ch</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-muted-foreground">Agence classique</span>
                </div>
              </div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <div 
                key={index}
                className={`grid grid-cols-3 border-t border-border/50 ${row.highlight ? 'bg-emerald-500/5' : ''}`}
              >
                <div className="p-6 border-r border-border/50 flex items-center">
                  <span className={row.highlight ? 'font-semibold' : ''}>{row.criteria}</span>
                </div>
                <div className="p-6 border-r border-border/50 flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className={`${row.highlight ? 'font-bold text-emerald-500' : 'text-foreground'}`}>
                    {row.immorama}
                  </span>
                </div>
                <div className="p-6 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-muted-foreground">{row.classique}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison - Mobile */}
        <div className="md:hidden space-y-4">
          {comparisonData.map((row, index) => (
            <div 
              key={index}
              className={`p-4 rounded-2xl border border-border/50 ${row.highlight ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-card'}`}
            >
              <p className="font-semibold mb-3">{row.criteria}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Immo-rama</span>
                  </div>
                  <p className={`text-sm ${row.highlight ? 'font-bold text-emerald-500' : ''}`}>
                    {row.immorama}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Classique</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{row.classique}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a 
            href="#formulaire-vendeur"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-primary/25"
          >
            Rejoindre Immo-rama
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
