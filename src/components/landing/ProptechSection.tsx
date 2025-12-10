import { Sparkles, Radar, BarChart3, FileCheck, LayoutDashboard, Cpu, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Radar,
    title: 'Veille 24h/24',
    description: 'Nos robots surveillent tous les portails + notre réseau privé. Dès qu\'un bien sort, tu le sais.',
  },
  {
    icon: BarChart3,
    title: 'Matching intelligent',
    description: 'On te propose que les biens qui matchent vraiment avec ton budget et ta situation.',
  },
  {
    icon: FileCheck,
    title: 'Dossier pro généré auto',
    description: 'Un dossier aux standards des régies, prêt à envoyer. Zéro prise de tête.',
  },
  {
    icon: LayoutDashboard,
    title: 'Ton tableau de bord perso',
    description: 'Suis chaque étape de ta recherche en direct depuis ton espace client.',
  },
];

export function ProptechSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />

      {/* Tech-inspired grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      {/* Animated orbs */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[15%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 left-[15%] w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Cpu className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">🤖 Tech & Innovation</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Ce que font nos outils <span className="text-primary">pour toi</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            La tech au service de ta recherche, 24h/24. Pendant que tu dors, on bosse.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/40 group animate-fade-in hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8 relative z-10">
                <div className="flex gap-5">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>

        {/* Bottom message */}
        <div className="text-center mt-12 md:mt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="inline-flex items-center gap-3 glass-morphism rounded-full px-6 py-3 border border-border/40 bg-card/80">
            <Crown className="h-5 w-5 text-amber-500" />
            <span className="text-foreground font-medium">L'alliance parfaite : humains + robots + réseau privé 🚀</span>
          </div>
        </div>
      </div>
    </section>
  );
}
