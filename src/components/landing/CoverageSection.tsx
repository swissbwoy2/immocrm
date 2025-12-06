import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const cantons = [
  { name: 'Vaud', cities: ['Lausanne', 'Montreux', 'Nyon', 'Yverdon'], color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { name: 'Genève', cities: ['Genève', 'Carouge', 'Vernier', 'Meyrin'], color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { name: 'Valais', cities: ['Sion', 'Sierre', 'Martigny', 'Monthey'], color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { name: 'Fribourg', cities: ['Fribourg', 'Bulle', 'Villars-sur-Glâne', 'Marly'], color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { name: 'Neuchâtel', cities: ['Neuchâtel', 'La Chaux-de-Fonds', 'Le Locle'], color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { name: 'Jura', cities: ['Delémont', 'Porrentruy', 'Saignelégier'], color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
];

export function CoverageSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Zones couvertes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Toute la Suisse Romande
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre réseau couvre les 6 cantons francophones de Suisse
          </p>
        </div>

        {/* Cantons grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cantons.map((canton, index) => (
            <div
              key={canton.name}
              className="bg-card border border-border rounded-xl p-6 card-interactive animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Canton header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${canton.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{canton.name}</h3>
              </div>

              {/* Cities */}
              <div className="flex flex-wrap gap-2">
                {canton.cities.map((city) => (
                  <Badge 
                    key={city} 
                    variant="outline" 
                    className={`${canton.color} text-xs`}
                  >
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Swiss flag decoration */}
        <div className="flex justify-center mt-12 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center gap-3 bg-card border border-border rounded-full px-6 py-3">
            <span className="text-2xl">🇨🇭</span>
            <span className="text-muted-foreground">Service 100% suisse romand</span>
          </div>
        </div>
      </div>
    </section>
  );
}
