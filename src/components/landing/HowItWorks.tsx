import { UserCheck, Radar, Users, Key, Sparkles, Zap, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: UserCheck,
    title: 'On analyse ton profil',
    description: 'Tes critères : revenus, budget, permis, zone souhaitée. 5 minutes de discussion, sans engagement.',
  },
  {
    icon: Radar,
    title: 'On active notre réseau',
    description: 'Nos experts contactent les régies partenaires et surveillent tous les portails pour toi.',
  },
  {
    icon: Users,
    title: 'Ton agent gère tout',
    description: 'Il filtre les offres, organise les visites (même déléguées !), et envoie ton dossier aux régies.',
  },
  {
    icon: Key,
    title: 'Tu emménages 🎉',
    description: 'Signature du bail et accompagnement jusqu\'aux clés. Bienvenue chez toi !',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-muted/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[15%] w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-[15%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Subtle sparkles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${25 + i * 25}%`,
              left: `${20 + i * 30}%`,
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
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Crown className="inline-block h-4 w-4 text-amber-500 mr-2" />
              <span className="text-sm font-semibold text-primary">Simple comme bonjour</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Comment on trouve <span className="text-primary">ton appart'</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Humains + Robots + Réseau privé = Efficacité maximale 🚀
          </p>
        </div>

        {/* Steps with timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
          {/* Timeline connector for desktop */}
          <div className="hidden lg:block absolute top-28 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full" />

          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/40 group animate-fade-in hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Step number */}
              <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 group-hover:border-primary/30 transition-all">
                    {index + 1}
                  </div>
                </div>
              </div>
              
              <CardContent className="pt-8 pb-10 relative z-10">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className="w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                    <step.icon className="h-9 w-9 md:h-10 md:w-10 text-primary" />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
