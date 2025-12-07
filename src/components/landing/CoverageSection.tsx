import { MapPin, CheckCircle, Sparkles, Star, Globe } from 'lucide-react';

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
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Premium mesh gradient background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-48 h-48 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-[10%] w-56 h-56 bg-gradient-to-tr from-green-500/12 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-[5%] w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-[5%] w-36 h-36 bg-gradient-to-l from-blue-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Floating sparkles and stars - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.4}s` }}
            />
          </div>
        ))}
        {[...Array(5)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${25 + Math.random() * 50}%`,
              left: `${15 + Math.random() * 70}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/30 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.6}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header with sparkles */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            {/* Glow behind badge */}
            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative glass-morphism rounded-full px-5 py-2.5 overflow-hidden border border-primary/20">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Globe className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">Zones couvertes</span>
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
            </div>
          </div>
          <div className="relative inline-block">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Toute la <span className="gradient-text-animated">Suisse Romande</span>
            </h2>
            {/* Sparkles around title - hidden on mobile */}
            <Sparkles className="hidden md:block absolute -top-3 -right-10 h-6 w-6 text-primary animate-pulse" />
            <Sparkles className="hidden md:block absolute -bottom-1 -left-8 h-5 w-5 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <Star className="hidden md:block absolute top-1/2 -right-14 h-4 w-4 text-primary/50 animate-float" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre réseau couvre les 6 cantons francophones de Suisse
          </p>
        </div>

        {/* Cantons grid - premium styled */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 md:gap-6">
          {cantons.map((canton, index) => (
            <div
              key={canton.name}
              className="relative rounded-2xl p-6 md:p-8 text-center animate-fade-in group"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Animated border gradient on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${canton.gradient} animate-gradient-x`} />
                <div className="absolute inset-[2px] rounded-2xl bg-card" />
              </div>

              {/* Glow effect on hover */}
              <div className={`absolute -inset-2 bg-gradient-to-r ${canton.gradient} rounded-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-500 blur-xl`} />

              {/* Glass background */}
              <div className="absolute inset-0 glass-morphism rounded-2xl border border-border/30 group-hover:border-transparent transition-all duration-300" />

              {/* Floating particles on hover - hidden on mobile */}
              <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 bg-gradient-to-r ${canton.gradient} rounded-full animate-float`}
                    style={{
                      top: `${25 + i * 18}%`,
                      left: `${18 + i * 20}%`,
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none rounded-2xl" />

              <div className="relative z-10">
                {/* Canton icon with gradient and glow */}
                <div className="relative mx-auto mb-5">
                  {/* Pulsing ring */}
                  <div className={`absolute inset-0 w-18 h-18 md:w-20 md:h-20 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} opacity-30 group-hover:scale-125 group-hover:opacity-0 transition-all duration-500`} />
                  <div className={`w-18 h-18 md:w-20 md:h-20 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl`}>
                    <MapPin className="h-9 w-9 md:h-10 md:w-10 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 w-18 h-18 md:w-20 md:h-20 mx-auto rounded-xl bg-gradient-to-br ${canton.gradient} blur-xl opacity-0 group-hover:opacity-60 transition-opacity`} />
                </div>
                
                {/* Canton name */}
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                  {canton.name}
                </h3>
                
                {/* Coverage indicator with sparkle */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground relative">
                  <div className="relative">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {/* Pulse on check */}
                    <div className="absolute inset-0 bg-primary rounded-full opacity-0 group-hover:opacity-40 group-hover:scale-150 transition-all duration-500" />
                  </div>
                  <span className="text-sm font-medium">Tout le canton</span>
                  <Sparkles className="h-3 w-3 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </div>
              </div>

              {/* Bottom gradient accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${canton.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`} />

              {/* Hover gradient effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${canton.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl pointer-events-none`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
