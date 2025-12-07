import { User, MessageSquare, Eye, CalendarCheck, FileText, Gift, Sparkles } from 'lucide-react';

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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        
        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/30 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.3}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4 relative overflow-hidden group">
            {/* Shine effect on badge */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="text-primary font-medium text-sm md:text-base relative z-10">✅ Ce que tu obtiens</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Tout ce qu'il te faut pour trouver{' '}
            <span className="gradient-text-animated">ton appartement</span>
          </h2>
        </div>

        {/* Benefits grid - Premium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Animated border gradient on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              
              <div className="relative glass-morphism rounded-xl md:rounded-2xl p-5 md:p-6 border border-border/30 group-hover:border-primary/50 transition-all duration-300 md:group-hover:shadow-lg md:group-hover:shadow-primary/20 h-full bg-background/80 overflow-hidden md:group-hover:scale-[1.02]">
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                {/* Floating particles on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkles className="h-4 w-4 text-primary/50 animate-pulse" />
                </div>
                
                {/* Icon with enhanced animation */}
                <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-3 md:mb-4 md:group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-xl`}>
                  {/* Glow effect behind icon */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${benefit.gradient} blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                  <benefit.icon className="h-6 w-6 md:h-7 md:w-7 text-white relative z-10" />
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 group-hover:text-primary transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {benefit.description}
                </p>

                {/* Arrow indicator - hidden on mobile */}
                <div className="absolute top-5 right-5 md:top-6 md:right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 hidden md:block">
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
