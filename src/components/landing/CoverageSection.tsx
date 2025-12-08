import { MapPin, CheckCircle, Sparkles, Globe } from "lucide-react";

const cantons = [
  { name: "Vaud" },
  { name: "Genève" },
  { name: "Valais" },
  { name: "Fribourg" },
  { name: "Neuchâtel" },
  { name: "Jura" },
];

export function CoverageSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-muted/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-[10%] w-56 h-56 bg-primary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Subtle sparkles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${25 + i * 25}%`,
              left: `${20 + i * 30}%`,
            }}
          >
            <Sparkles
              className="h-3 w-3 text-primary/20 animate-pulse"
              style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Globe className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">Zones couvertes</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Toute la <span className="text-primary">Suisse Romande</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre réseau couvre les 6 cantons francophones de Suisse
          </p>
        </div>

        {/* Cantons grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 md:gap-6">
          {cantons.map((canton, index) => (
            <div
              key={canton.name}
              className="relative rounded-2xl p-6 md:p-8 text-center animate-fade-in group"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Glass background */}
              <div className="absolute inset-0 glass-morphism rounded-2xl border border-border/40 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5 transition-all duration-300 bg-card/80" />

              <div className="relative z-10">
                {/* Canton icon */}
                <div className="relative mx-auto mb-5">
                  <div className="w-18 h-18 md:w-20 md:h-20 mx-auto rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                    <MapPin className="h-9 w-9 md:h-10 md:w-10 text-primary" />
                  </div>
                </div>

                {/* Canton name */}
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                  {canton.name}
                </h3>

                {/* Coverage indicator */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium"></span>
                </div>
              </div>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
