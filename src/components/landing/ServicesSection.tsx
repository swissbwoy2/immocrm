import { Home, Building2, MapPin, FolderOpen, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: Home,
    title: 'Recherche à la location',
    description: 'Appartements et maisons à louer dans toute la Suisse romande, adaptés à votre budget.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Building2,
    title: "Recherche à l'achat",
    description: "Biens immobiliers à acheter : appartements, villas, terrains. Analyse de solvabilité incluse.",
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: MapPin,
    title: 'Toute la Suisse Romande',
    description: 'Vaud, Genève, Valais, Fribourg, Neuchâtel, Jura - nous couvrons les 6 cantons romands.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: FolderOpen,
    title: 'Gestion de dossier',
    description: 'Suivi complet de vos candidatures, documents centralisés et statuts en temps réel.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Calendar,
    title: 'Organisation des visites',
    description: 'Planification et coordination des visites avec les régies, même déléguées si besoin.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: MessageSquare,
    title: 'Messagerie directe',
    description: 'Communication instantanée avec votre agent pour un suivi réactif de votre recherche.',
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
            <span className="text-sm font-medium text-primary">Services complets</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nos <span className="gradient-text-animated">services</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un accompagnement complet pour votre recherche immobilière
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
