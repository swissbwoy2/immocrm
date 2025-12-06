import { UserCheck, Shield, BarChart3, MessageCircle, Clock, Award } from 'lucide-react';

const advantages = [
  {
    icon: UserCheck,
    title: 'Accompagnement personnalisé',
    description: 'Un agent dédié à votre recherche, disponible pour répondre à toutes vos questions.',
  },
  {
    icon: Shield,
    title: 'Dossier sécurisé en ligne',
    description: 'Vos documents sont stockés de manière sécurisée et accessibles à tout moment.',
  },
  {
    icon: BarChart3,
    title: 'Suivi en temps réel',
    description: 'Suivez l\'état de vos candidatures et visites depuis votre tableau de bord.',
  },
  {
    icon: MessageCircle,
    title: 'Messagerie intégrée',
    description: 'Communiquez directement avec votre agent via notre système de messagerie.',
  },
  {
    icon: Clock,
    title: 'Gain de temps',
    description: 'Nous recherchons et sélectionnons les biens correspondant à vos critères.',
  },
  {
    icon: Award,
    title: 'Expertise locale',
    description: 'Notre connaissance du marché romand vous garantit les meilleures opportunités.',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pourquoi nous choisir ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des avantages concrets pour une recherche immobilière sereine
          </p>
        </div>

        {/* Advantages grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advantages.map((advantage, index) => (
            <div
              key={index}
              className="flex gap-4 animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                  <advantage.icon className="h-6 w-6 text-primary" />
                </div>
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
