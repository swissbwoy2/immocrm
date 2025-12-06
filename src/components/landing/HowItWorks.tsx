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

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
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
          {/* Timeline connector for desktop */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 timeline-connector" />

          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="card-shine card-3d animate-fade-in relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Step number with pulse effect */}
              <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg pulse-ring`}>
                    {index + 1}
                  </div>
                </div>
              </div>
              
              <CardContent className="pt-6 pb-8 relative z-10">
                {/* Icon with gradient background */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-300 shadow-lg icon-float`}>
                  <step.icon className="h-8 w-8 text-white" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
