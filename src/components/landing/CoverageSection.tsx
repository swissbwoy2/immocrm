import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const cantons = [
  { name: 'Vaud', cities: ['Lausanne', 'Montreux', 'Nyon', 'Yverdon'], gradient: 'from-green-500 to-emerald-500', bgColor: 'bg-green-500/10', textColor: 'text-green-600', borderColor: 'border-green-500/30' },
  { name: 'Genève', cities: ['Genève', 'Carouge', 'Vernier', 'Meyrin'], gradient: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-600', borderColor: 'border-yellow-500/30' },
  { name: 'Valais', cities: ['Sion', 'Sierre', 'Martigny', 'Monthey'], gradient: 'from-red-500 to-rose-500', bgColor: 'bg-red-500/10', textColor: 'text-red-600', borderColor: 'border-red-500/30' },
  { name: 'Fribourg', cities: ['Fribourg', 'Bulle', 'Villars-sur-Glâne', 'Marly'], gradient: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', borderColor: 'border-blue-500/30' },
  { name: 'Neuchâtel', cities: ['Neuchâtel', 'La Chaux-de-Fonds', 'Le Locle'], gradient: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600', borderColor: 'border-purple-500/30' },
  { name: 'Jura', cities: ['Delémont', 'Porrentruy', 'Saignelégier'], gradient: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-600', borderColor: 'border-orange-500/30' },
];

export function CoverageSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 mesh-gradient opacity-40" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Zones couvertes</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Toute la <span className="gradient-text-animated">Suisse Romande</span>
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
              className="glass-morphism rounded-xl p-6 card-shine card-3d animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Canton header with gradient icon */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${canton.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{canton.name}</h3>
              </div>

              {/* Cities with animated badges */}
              <div className="flex flex-wrap gap-2">
                {canton.cities.map((city, cityIndex) => (
                  <Badge 
                    key={city} 
                    variant="outline" 
                    className={`${canton.bgColor} ${canton.textColor} ${canton.borderColor} text-xs hover:scale-105 transition-transform cursor-default`}
                    style={{ animationDelay: `${(index * 100) + (cityIndex * 50)}ms` }}
                  >
                    {city}
                  </Badge>
                ))}
              </div>

              {/* Hover gradient effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${canton.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl`} />
            </div>
          ))}
        </div>

        {/* Swiss flag decoration with enhanced styling */}
        <div className="flex justify-center mt-12 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="glass-morphism rounded-full px-8 py-4 flex items-center gap-4 glow-breathe">
            <span className="text-3xl">🇨🇭</span>
            <span className="text-muted-foreground font-medium">
              Service <span className="text-primary">100% suisse romand</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
