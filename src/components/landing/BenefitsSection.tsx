import { User, MessageSquare, Eye, CalendarCheck, FileText, Gift, Sparkles, Crown } from 'lucide-react';

const benefits = [
  {
    icon: User,
    title: 'Un conseiller dédié à votre service',
    description: 'Votre expert recherche activement pendant que vous poursuivez votre quotidien. Gagnez un temps précieux.',
  },
  {
    icon: MessageSquare,
    title: 'Votre espace client personnel',
    description: 'Offres, visites, dossier – tout centralisé et accessible 24h/24 depuis votre tableau de bord.',
  },
  {
    icon: Eye,
    title: 'Suivi transparent en temps réel',
    description: 'Vous savez exactement où en sont vos candidatures. Une visibilité totale sur chaque étape.',
  },
  {
    icon: CalendarCheck,
    title: 'Visites organisées pour vous',
    description: 'Indisponible ? Nous visitons à votre place et vous fournissons un compte-rendu détaillé.',
  },
  {
    icon: FileText,
    title: 'Dossier professionnel et convaincant',
    description: 'Préparé selon les standards des régies pour maximiser vos chances de sélection.',
  },
  {
    icon: Crown,
    title: 'Accès exclusif au Réseau Privilégié',
    description: 'Des biens hors marché accessibles uniquement via nos partenaires régies et propriétaires.',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-12 md:py-24 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      {/* Subtle animated orb - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Subtle floating sparkles - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + i * 20}%`,
              left: `${15 + i * 25}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/20 animate-pulse" 
              style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative bg-primary/10 rounded-full px-5 py-2.5 border border-primary/20">
              <span className="text-primary font-semibold text-sm md:text-base">✓ Nos engagements</span>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
            Un accompagnement d'excellence{' '}
            <span className="text-primary">pour votre recherche</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Pendant que vous poursuivez vos activités, notre équipe s'occupe de tout.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Subtle border glow on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              
              <div className="relative glass-morphism rounded-2xl p-6 md:p-8 border border-border/40 group-hover:border-primary/30 transition-all duration-300 h-full bg-card/80 backdrop-blur-sm overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:-translate-y-1">
                {/* Subtle shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 delay-100 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
                
                {/* Step number */}
                <div className="absolute top-4 left-4 opacity-40 group-hover:opacity-60 transition-opacity">
                  <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                </div>
                
                {/* Icon */}
                <div className="relative mb-5 md:mb-6">
                  <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                    <benefit.icon className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
