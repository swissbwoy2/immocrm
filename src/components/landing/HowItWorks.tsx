import { FileText, UserCheck, Home, CheckCircle, Sparkles, Star, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: FileText,
    title: 'Remplissez votre mandat',
    description: 'Créez votre profil et définissez vos critères de recherche en quelques minutes.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: UserCheck,
    title: 'Agent dédié assigné',
    description: 'Un agent immobilier expérimenté est assigné à votre dossier pour un suivi personnalisé.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Home,
    title: 'Recevez des offres',
    description: 'Recevez des offres immobilières correspondant parfaitement à vos critères.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: CheckCircle,
    title: 'Trouvez votre bien',
    description: 'Visitez les biens sélectionnés et trouvez le logement idéal avec notre accompagnement.',
    gradient: 'from-orange-500 to-red-500',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Premium mesh gradient background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[15%] w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-20 right-[15%] w-48 h-48 bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-[5%] w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-[5%] w-36 h-36 bg-gradient-to-l from-green-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Floating sparkles and stars - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.4}s` }}
            />
          </div>
        ))}
        {[...Array(4)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${25 + Math.random() * 50}%`,
              left: `${15 + Math.random() * 70}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/30 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.6}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            {/* Glow behind badge */}
            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative glass-morphism rounded-full px-5 py-2.5 overflow-hidden border border-primary/20">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Zap className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary relative z-10">Simple & Efficace</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 relative inline-block">
            Comment ça <span className="gradient-text-animated">marche</span> ?
            <Sparkles className="absolute -top-2 -right-6 h-5 w-5 text-primary animate-pulse hidden md:block" />
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un processus simple et efficace pour trouver votre bien immobilier en Suisse romande
          </p>
        </div>

        {/* Steps with timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
          {/* Timeline connector for desktop - animated gradient */}
          <div className="hidden lg:block absolute top-28 left-[12.5%] right-[12.5%] h-1 overflow-hidden rounded-full">
            <div className="h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 animate-gradient-x" />
            {/* Pulsing dots on timeline */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" style={{ animationDelay: '1s' }} />
          </div>

          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated border gradient on hover */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${step.gradient} animate-gradient-x`} />
                <div className="absolute inset-[2px] rounded-lg bg-card" />
              </div>

              {/* Glow effect on hover */}
              <div className={`absolute -inset-2 bg-gradient-to-r ${step.gradient} rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl`} />

              {/* Floating particles - hidden on mobile */}
              <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 bg-gradient-to-r ${step.gradient} rounded-full animate-float`}
                    style={{
                      top: `${25 + i * 18}%`,
                      left: `${15 + i * 22}%`,
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

              {/* Step number with pulse effect */}
              <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                  {/* Pulse rings */}
                  <div className={`absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} opacity-30 animate-ping`} style={{ animationDuration: '2.5s' }} />
                  <div className={`absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} opacity-20 animate-pulse`} style={{ animationDuration: '2s' }} />
                  <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                    {index + 1}
                  </div>
                </div>
              </div>

              {/* Sparkle on hover */}
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="h-4 w-4 text-primary/60 animate-pulse" />
              </div>
              
              <CardContent className="pt-8 pb-10 relative z-10">
                {/* Icon with gradient background and glow */}
                <div className="relative mb-6">
                  <div className={`w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl`}>
                    <step.icon className="h-9 w-9 md:h-10 md:w-10 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${step.gradient} blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                  {/* Pulsing ring */}
                  <div className={`absolute inset-0 w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-30 group-hover:scale-125 group-hover:opacity-0 transition-all duration-500`} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>

              {/* Bottom gradient accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
