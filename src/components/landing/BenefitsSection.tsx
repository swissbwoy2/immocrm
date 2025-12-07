import { User, MessageSquare, Eye, CalendarCheck, FileText, Gift } from 'lucide-react';

const benefits = [
  {
    icon: User,
    title: 'Un agent dédié',
    description: 'qui gère tout pour toi',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Espace client personnalisé',
    description: 'avec messagerie directe',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Eye,
    title: 'Suivi en temps réel',
    description: 'de tes candidatures',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: CalendarCheck,
    title: 'Organisation des visites',
    description: 'même déléguées si tu n\'es pas dispo !',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: FileText,
    title: 'Ton dossier géré',
    description: 'et envoyé aux régies',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Gift,
    title: 'Offres exclusives',
    description: 'via notre réseau d\'agences partenaires',
    gradient: 'from-amber-500 to-yellow-500',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-12 md:py-20 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Background effects - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <span className="text-primary font-medium text-sm md:text-base">✅ Ce que tu obtiens</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Tout ce qu'il te faut pour trouver{' '}
            <span className="gradient-text-animated">ton appartement</span>
          </h2>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="relative glass-morphism rounded-xl md:rounded-2xl p-5 md:p-6 border border-border/30 hover:border-primary/50 transition-all duration-300 md:hover:shadow-lg md:hover:shadow-primary/10 h-full">
                {/* Icon */}
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-3 md:mb-4 md:group-hover:scale-110 transition-transform duration-300`}>
                  <benefit.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {benefit.description}
                </p>

                {/* Arrow indicator - hidden on mobile */}
                <div className="absolute top-5 right-5 md:top-6 md:right-6 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  <span className="text-primary text-xl">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
