import { FileText, UserCheck, Home, CheckCircle } from 'lucide-react';
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
    <section className="py-24 relative overflow-hidden">
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[15%] w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-20 right-[15%] w-40 h-40 bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-[5%] w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/60 rounded-full animate-pulse"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4 relative overflow-hidden group">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="text-sm font-medium text-primary">Simple & Efficace</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Comment ça <span className="gradient-text-animated">marche</span> ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un processus simple et efficace pour trouver votre bien immobilier en Suisse romande
          </p>
        </div>

        {/* Steps with timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Timeline connector for desktop - animated gradient */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 animate-gradient-x" />
            {/* Pulsing dot on timeline */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>

          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated border gradient on hover */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 animate-gradient-x" />
                <div className="absolute inset-[1px] rounded-lg bg-card" />
              </div>

              {/* Floating particles - hidden on mobile */}
              <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
                    style={{
                      top: `${30 + i * 20}%`,
                      left: `${20 + i * 25}%`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

              {/* Step number with pulse effect */}
              <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                  {/* Pulse ring */}
                  <div className={`absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br ${step.gradient} opacity-30 animate-ping`} style={{ animationDuration: '2s' }} />
                  <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                    {index + 1}
                  </div>
                </div>
              </div>
              
              <CardContent className="pt-6 pb-8 relative z-10">
                {/* Icon with gradient background and glow */}
                <div className="relative mb-5">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                    <step.icon className="h-8 w-8 text-white group-hover:animate-bounce" style={{ animationDuration: '1s', animationIterationCount: '1' }} />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
