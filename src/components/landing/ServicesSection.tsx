import { Home, Building2, MapPin, FolderOpen, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: Home,
    title: 'Recherche location',
    description: 'On prospecte là où tu n\'as pas le temps d\'aller. Appartements et maisons dans toute la Suisse romande.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Building2,
    title: "Recherche achat",
    description: "Appartements, villas, terrains. Analyse de solvabilité offerte pour connaître exactement ton budget.",
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: MapPin,
    title: '6 cantons, 1 interlocuteur',
    description: 'Vaud, Genève, Valais, Fribourg, Neuchâtel, Jura. On gère les régies locales pour toi.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: FolderOpen,
    title: 'Dossier qui convainc',
    description: 'On prépare un dossier béton qui sort du lot. Tes candidatures passent en priorité.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Calendar,
    title: 'Visites organisées',
    description: 'Planification complète avec les régies. Pas dispo ? On visite pour toi en vidéo HD.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: MessageSquare,
    title: 'Réponse sous 2h',
    description: 'Un vrai humain te répond en 2h ouvrées max. Pas de bot, pas d\'attente interminable.',
    gradient: 'from-teal-500 to-cyan-500',
  },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 mesh-gradient opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
            <span className="text-sm font-medium text-primary">Tout inclus</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Un accompagnement <span className="gradient-text-animated">complet</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tout ce qu'il faut pour que tu n'aies plus rien à faire
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="card-shine card-3d animate-fade-in group overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 relative">
                {/* Icon with gradient background and glow */}
                <div className="relative mb-5">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                    <service.icon className="h-7 w-7 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${service.gradient} blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>

                {/* Bottom gradient line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${service.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
