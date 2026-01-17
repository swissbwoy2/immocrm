import { EyeOff, Users, Clock, Shield, Lock, Sparkles } from 'lucide-react';

const advantages = [
  {
    icon: EyeOff,
    title: 'Aucune annonce publique',
    description: 'Votre bien n\'apparaît sur aucun portail immobilier. Pas de Homegate, pas d\'Immoscout, pas de curieux.',
  },
  {
    icon: Users,
    title: 'Acheteurs qualifiés uniquement',
    description: 'Nous présentons votre bien exclusivement à nos acheteurs vérifiés, avec capacité financière confirmée.',
  },
  {
    icon: Clock,
    title: 'Vente en quelques semaines',
    description: 'Pas de mois d\'attente. Nos acheteurs sont prêts à passer à l\'action immédiatement.',
  },
  {
    icon: Shield,
    title: 'Confidentialité totale',
    description: 'Vos voisins, votre employeur, votre famille : personne ne saura que vous vendez, sauf si vous le souhaitez.',
  },
];

export function VendeurOffMarketSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Vente Off-Market</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Vendez en toute
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              discrétion et rapidité
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Fini les visites de curieux du dimanche. Votre bien est présenté uniquement 
            à des acheteurs sérieux, qualifiés et prêts à signer. C'est ça, le off-market.
          </p>
        </div>

        {/* Visual illustration */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left side - Off market visual */}
              <div className="relative">
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiIGN4PSIyMCIgY3k9IjIwIiByPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
                  <div className="relative z-10 text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <EyeOff className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mb-2">Votre bien</p>
                    <p className="text-muted-foreground">Invisible sur les portails publics</p>
                  </div>
                </div>
                
                {/* Crossed out portals */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  {['Homegate', 'Immoscout', 'Comparis'].map((portal, index) => (
                    <div 
                      key={portal}
                      className="relative px-3 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground"
                    >
                      <span className="line-through">{portal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Benefits */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold">Pourquoi vendre off-market ?</h3>
                <ul className="space-y-4">
                  {[
                    'Pas de dépréciation par surexposition',
                    'Pas de pression à baisser le prix',
                    'Acheteurs motivés et qualifiés',
                    'Négociations sereines',
                    'Vente plus rapide',
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Advantages grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((advantage, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <advantage.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{advantage.title}</h3>
              <p className="text-muted-foreground text-sm">{advantage.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
