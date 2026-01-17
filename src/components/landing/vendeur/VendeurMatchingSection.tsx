import { Users, MapPin, Home, Wallet, Target, Sparkles } from 'lucide-react';

const buyerProfiles = [
  { type: 'Famille', budget: '800k - 1.2M', location: 'Lausanne', criteria: 'Villa 5+ pièces' },
  { type: 'Investisseur', budget: '500k - 900k', location: 'Genève', criteria: 'Immeuble rapport' },
  { type: 'Couple', budget: '600k - 850k', location: 'Nyon', criteria: 'Appartement 4 pièces' },
  { type: 'Expatrié', budget: '1M - 2M', location: 'Morges', criteria: 'Villa avec vue lac' },
];

const stats = [
  { value: '340+', label: 'Acheteurs actifs' },
  { value: '89%', label: 'Taux de matching' },
  { value: '6', label: 'Cantons couverts' },
  { value: '21j', label: 'Délai moyen vente' },
];

export function VendeurMatchingSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-accent/5 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Matching Intelligent</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Des centaines d'acheteurs cherchent
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              un bien comme le vôtre
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Notre système analyse en temps réel les critères de nos acheteurs qualifiés 
            et les fait correspondre avec les biens disponibles. Pas de visites inutiles, 
            uniquement des acheteurs sérieux et prêts à passer à l'action.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                {stat.value}
              </p>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Buyer profiles visualization */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Profils d'acheteurs en recherche active</h3>
            <p className="text-muted-foreground">Exemples anonymisés de notre base d'acheteurs qualifiés</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {buyerProfiles.map((profile, index) => (
              <div 
                key={index}
                className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 animate-fade-in"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{profile.type}</p>
                        <p className="text-sm text-muted-foreground">Recherche active</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-xs font-medium text-emerald-500">Qualifié</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile.budget}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile.location}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile.criteria}</span>
                    </div>
                  </div>
                </div>

                {/* Matching animation */}
                <Sparkles className="absolute top-4 right-4 w-5 h-5 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <p className="text-lg text-muted-foreground mb-4">
              <span className="text-foreground font-semibold">Votre bien correspond-il à leurs critères ?</span>
            </p>
            <a 
              href="#formulaire-vendeur"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-primary/25"
            >
              <Target className="w-5 h-5" />
              Tester le matching gratuitement
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
