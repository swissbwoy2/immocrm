import { Building2, FileCheck, CalendarCheck, MessageCircle, RefreshCw, UserCheck, Award } from 'lucide-react';

const advantages = [
  {
    icon: Building2,
    title: 'Réseau d\'agences partenaires',
    description: 'Accédez à notre réseau d\'agences immobilières en Suisse Romande pour maximiser vos chances.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FileCheck,
    title: 'Suivi rigoureux de dossier',
    description: 'Votre dossier est suivi de A à Z avec rigueur et transparence. Rien n\'est laissé au hasard.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: CalendarCheck,
    title: 'Délégation de visite',
    description: 'Vous ne pouvez pas visiter ? Pas de panique, votre agent s\'en occupe pour vous !',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageCircle,
    title: 'Messagerie directe',
    description: 'Échangez en temps réel avec votre agent dédié via notre messagerie intégrée.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: RefreshCw,
    title: 'Acompte 100% remboursé',
    description: 'Satisfait ou remboursé : récupérez votre acompte intégralement sous 30 jours.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: UserCheck,
    title: 'Agent dédié',
    description: 'Un interlocuteur unique qui connaît votre dossier et vous accompagne jusqu\'au bout.',
    gradient: 'from-teal-500 to-cyan-500',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Nos avantages</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Pourquoi nous <span className="gradient-text-animated">choisir</span> ?
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
              className="flex gap-5 animate-fade-in group p-4 rounded-xl hover:bg-card/50 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon with gradient and float animation */}
              <div className="flex-shrink-0 relative">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${advantage.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg icon-float`}>
                  <advantage.icon className="h-7 w-7 text-white" />
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${advantage.gradient} blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
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
