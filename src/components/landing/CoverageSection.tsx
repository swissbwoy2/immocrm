import { MapPin, CheckCircle, Sparkles } from 'lucide-react';

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

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-40 h-40 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-[10%] w-48 h-48 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-[5%] w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/60 rounded-full animate-pulse"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header with sparkles */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4 relative overflow-hidden group">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Zones couvertes</span>
          </div>
          <div className="relative inline-block">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Toute la <span className="gradient-text-animated">Suisse Romande</span>
            </h2>
            {/* Sparkles around title - hidden on mobile */}
            <Sparkles className="hidden md:block absolute -top-2 -right-8 h-5 w-5 text-primary animate-pulse" />
            <Sparkles className="hidden md:block absolute -bottom-1 -left-6 h-4 w-4 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre réseau couvre les 6 cantons francophones de Suisse
          </p>
        </div>

        {/* Cantons grid - premium styled */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cantons.map((canton, index) => (
            <div
              key={canton.name}
              className="relative rounded-xl p-6 text-center animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated border gradient on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${canton.gradient} animate-gradient-x`} />
                <div className="absolute inset-[1px] rounded-xl bg-card" />
              </div>

              {/* Glass background */}
              <div className="absolute inset-0 glass-morphism rounded-xl" />

              {/* Floating particles on hover - hidden on mobile */}
              <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1 h-1 bg-gradient-to-r ${canton.gradient} rounded-full animate-float`}
                    style={{
                      top: `${30 + i * 20}%`,
                      left: `${20 + i * 25}%`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none rounded-xl" />

              <div className="relative z-10">
                {/* Canton icon with gradient and glow */}
                <div className="relative mx-auto mb-4">
                  <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                    <MapPin className="h-8 w-8 text-white group-hover:animate-bounce" style={{ animationDuration: '0.6s', animationIterationCount: '1' }} />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity`} />
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
              </div>

              {/* Hover gradient effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${canton.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl pointer-events-none`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
