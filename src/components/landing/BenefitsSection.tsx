import { User, MessageSquare, Eye, CalendarCheck, FileText, Gift, Sparkles, Star } from 'lucide-react';

const benefits = [
  {
    icon: User,
    title: 'Un agent dédié',
    description: 'qui gère tout pour toi',
    gradient: 'from-blue-500 to-cyan-500',
    glowColor: 'blue',
  },
  {
    icon: MessageSquare,
    title: 'Espace client personnalisé',
    description: 'avec messagerie directe',
    gradient: 'from-purple-500 to-pink-500',
    glowColor: 'purple',
  },
  {
    icon: Eye,
    title: 'Suivi en temps réel',
    description: 'de tes candidatures',
    gradient: 'from-orange-500 to-red-500',
    glowColor: 'orange',
  },
  {
    icon: CalendarCheck,
    title: 'Organisation des visites',
    description: 'même déléguées si tu n\'es pas dispo !',
    gradient: 'from-green-500 to-emerald-500',
    glowColor: 'green',
  },
  {
    icon: FileText,
    title: 'Ton dossier géré',
    description: 'et envoyé aux régies',
    gradient: 'from-indigo-500 to-violet-500',
    glowColor: 'indigo',
  },
  {
    icon: Gift,
    title: 'Offres exclusives',
    description: 'via notre réseau d\'agences partenaires',
    gradient: 'from-amber-500 to-yellow-500',
    glowColor: 'amber',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-12 md:py-24 relative overflow-hidden">
      {/* Premium mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      {/* Animated orbs - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gradient-to-r from-green-500/8 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-0 w-[350px] h-[350px] bg-gradient-to-l from-orange-500/8 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
      
      {/* Floating sparkles - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.2}s` }}
            />
          </div>
        ))}
        {/* Extra floating stars */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/30 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.4}s` }}
            />
          </div>
        ))}
      </div>

      {/* Decorative gradient lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-0 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-3/4 right-0 w-1/2 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header - Premium style */}
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          {/* Badge with pulsing glow and shine effect */}
          <div className="inline-flex items-center gap-2 relative group mb-4">
            {/* Outer glow ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative bg-primary/10 rounded-full px-5 py-2.5 overflow-hidden border border-primary/20">
              {/* Shine effect on badge */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              {/* Sparkle in badge */}
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
              <span className="text-primary font-semibold text-sm md:text-base relative z-10">✅ Ce que tu obtiens</span>
            </div>
          </div>
          
          {/* Title with animated gradient text */}
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
            Tout ce qu'il te faut pour trouver{' '}
            <span className="gradient-text-animated relative">
              ton appartement
              {/* Decorative sparkle on title */}
              <Sparkles className="absolute -top-2 -right-6 h-5 w-5 text-primary/60 animate-pulse hidden md:block" />
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Notre équipe s'occupe de tout pour que tu puisses te concentrer sur l'essentiel
          </p>
        </div>

        {/* Benefits grid - Premium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Animated border gradient - always visible subtle, stronger on hover */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${benefit.gradient} rounded-2xl opacity-20 group-hover:opacity-100 transition-all duration-500 blur-sm group-hover:blur-md`} />
              
              {/* Pulsing glow effect on hover */}
              <div className={`absolute -inset-2 bg-gradient-to-r ${benefit.gradient} rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl animate-pulse`} style={{ animationDuration: '2s' }} />
              
              <div className="relative glass-morphism rounded-2xl p-6 md:p-8 border border-border/30 group-hover:border-primary/50 transition-all duration-500 h-full bg-background/90 overflow-hidden group-hover:shadow-2xl group-hover:shadow-primary/20 md:group-hover:scale-[1.02] group-hover:-translate-y-1">
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 delay-100 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
                
                {/* Floating particles on hover - hidden on mobile */}
                <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-1.5 h-1.5 bg-gradient-to-r ${benefit.gradient} rounded-full animate-float`}
                      style={{
                        top: `${20 + i * 20}%`,
                        left: `${15 + i * 20}%`,
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: `${2 + i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Sparkle on hover */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:rotate-12">
                  <Sparkles className="h-5 w-5 text-primary/60 animate-pulse" />
                </div>
                
                {/* Step number badge */}
                <div className="absolute top-4 left-4 opacity-40 group-hover:opacity-70 transition-opacity">
                  <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                </div>
                
                {/* Icon with enhanced animation and glow */}
                <div className="relative mb-5 md:mb-6">
                  <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center md:group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                    {/* Icon glow effect behind */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${benefit.gradient} blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                    {/* Pulsing ring */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${benefit.gradient} opacity-30 group-hover:scale-150 group-hover:opacity-0 transition-all duration-700`} />
                    <benefit.icon className="h-7 w-7 md:h-8 md:w-8 text-white relative z-10" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>

                {/* Arrow indicator on hover - hidden on mobile */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 hidden md:block">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${benefit.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-white text-sm font-bold">→</span>
                  </div>
                </div>

                {/* Bottom gradient accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
