import { Building2, FileCheck, CalendarCheck, MessageCircle, Shield, UserCheck, Award, Coins } from 'lucide-react';

const advantages = [
  {
    icon: Building2,
    title: '+50 agences partenaires',
    description: 'Un réseau exclusif dans 6 cantons romands. Des portes qui s\'ouvrent pour toi.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FileCheck,
    title: 'Rapport hebdomadaire',
    description: 'Chaque semaine, tu reçois un compte-rendu de toutes les actions menées. Zéro zone d\'ombre.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: CalendarCheck,
    title: 'Visite filmée en HD',
    description: 'Pas dispo ? On visite pour toi avec vidéo HD + compte-rendu détaillé en 24h.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageCircle,
    title: 'Réponse sous 2h',
    description: 'Une question ? Ton agent te répond en 2h ouvrées max. Pas de bot, un vrai humain.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Shield,
    title: '100% remboursé si échec',
    description: '300 CHF remboursés intégralement après 3 mois sans résultat. Promis, signé.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Coins,
    title: 'Pas de frais cachés',
    description: '1 mois de loyer SEULEMENT en cas de succès. Pas de succès = pas de frais.',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Ce qui nous différencie</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Pourquoi <span className="gradient-text-animated">500+ clients</span> nous font confiance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des engagements concrets, pas des promesses en l'air
          </p>
        </div>

        {/* Advantages grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advantages.map((advantage, index) => (
            <div
              key={index}
              className="flex gap-5 animate-fade-in group p-4 rounded-xl hover:bg-card/50 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon with gradient and float animation */}
              <div className="flex-shrink-0 relative">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${advantage.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg icon-float`}>
                  <advantage.icon className="h-7 w-7 text-white" />
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${advantage.gradient} blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
              </div>

              {/* Content */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {advantage.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {advantage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
