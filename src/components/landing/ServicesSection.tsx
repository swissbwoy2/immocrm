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
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nos services
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
              className="card-interactive animate-fade-in group overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                {/* Icon with gradient background */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
