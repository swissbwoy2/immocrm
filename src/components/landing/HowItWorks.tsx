import { FileText, UserCheck, Home, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: FileText,
    title: 'Remplissez votre mandat',
    description: 'Créez votre profil et définissez vos critères de recherche en quelques minutes.',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    icon: UserCheck,
    title: 'Agent dédié assigné',
    description: 'Un agent immobilier expérimenté est assigné à votre dossier pour un suivi personnalisé.',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    icon: Home,
    title: 'Recevez des offres',
    description: 'Recevez des offres immobilières correspondant parfaitement à vos critères.',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    icon: CheckCircle,
    title: 'Trouvez votre bien',
    description: 'Visitez les biens sélectionnés et trouvez le logement idéal avec notre accompagnement.',
    color: 'bg-orange-500/10 text-orange-500',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un processus simple et efficace pour trouver votre bien immobilier en Suisse romande
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="card-interactive animate-fade-in relative overflow-hidden group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Step number */}
              <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 group-hover:text-primary/10 transition-colors">
                {index + 1}
              </div>
              
              <CardContent className="pt-6 pb-8 relative z-10">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <step.icon className="h-7 w-7" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </CardContent>

              {/* Connector line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
