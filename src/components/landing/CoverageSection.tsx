import { MapPin, CheckCircle } from 'lucide-react';

const cantons = [
  { name: 'Vaud', gradient: 'from-green-500 to-emerald-500' },
  { name: 'Genève', gradient: 'from-yellow-500 to-orange-500' },
  { name: 'Valais', gradient: 'from-red-500 to-rose-500' },
  { name: 'Fribourg', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Neuchâtel', gradient: 'from-purple-500 to-violet-500' },
  { name: 'Jura', gradient: 'from-orange-500 to-amber-500' },
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

        {/* Cantons grid - simplified */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cantons.map((canton, index) => (
            <div
              key={canton.name}
              className="glass-morphism rounded-xl p-6 card-shine card-3d animate-fade-in group text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Canton icon with gradient */}
              <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg mb-4`}>
                <MapPin className="h-8 w-8 text-white" />
              </div>
              
              {/* Canton name */}
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                {canton.name}
              </h3>
              
              {/* Coverage indicator */}
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-xs">Tout le canton</span>
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
