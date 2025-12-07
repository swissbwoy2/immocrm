import { Briefcase, ArrowRight, Users, Building2, Sparkles } from 'lucide-react';

export function DifferentiationSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-primary/[0.03] to-muted/10" />
      
      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-[10%] w-56 h-56 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
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
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="animate-fade-in mb-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-2xl bg-primary/10 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 shadow-lg shadow-primary/10 flex items-center justify-center relative z-10">
                <Briefcase className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>

          {/* Main message */}
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              On n'est <span className="text-primary">PAS</span> une agence immobilière classique
            </h2>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <span className="text-foreground font-semibold">Les agences vendent des biens.</span>
          </p>
          
          <p className="text-xl md:text-2xl text-primary font-semibold mb-12 animate-fade-in" style={{ animationDelay: '250ms' }}>
            Nous, on te trouve LE tien.
          </p>

          {/* Visual representation */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* You */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/15 transition-all duration-300">
                  <Users className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                </div>
              </div>
              <span className="font-semibold text-foreground text-lg">Toi</span>
            </div>

            {/* Arrow 1 */}
            <div className="hidden md:flex items-center">
              <div className="flex items-center gap-1">
                <div className="w-12 h-0.5 bg-gradient-to-r from-primary/30 to-primary/60 rounded-full" />
                <ArrowRight className="h-6 w-6 text-primary/70" />
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-7 w-7 text-primary/70 rotate-90" />
            </div>

            {/* Immo-Rama */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/20 animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/15 border-2 border-primary shadow-lg shadow-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                  <span className="text-2xl md:text-3xl font-bold text-primary">IR</span>
                </div>
              </div>
              <span className="font-bold text-primary text-lg">Immo-Rama</span>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:flex items-center">
              <div className="flex items-center gap-1">
                <div className="w-12 h-0.5 bg-gradient-to-r from-primary/30 to-primary/60 rounded-full" />
                <ArrowRight className="h-6 w-6 text-primary/70" />
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-7 w-7 text-primary/70 rotate-90" />
            </div>

            {/* Régies */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-muted/50 border-2 border-border flex items-center justify-center group-hover:border-primary/30 group-hover:bg-muted transition-all duration-300">
                  <Building2 className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <span className="font-semibold text-foreground text-lg">Régies & Propriétaires</span>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="mt-12 md:mt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="inline-block relative group">
              <div className="relative px-8 py-4 glass-morphism rounded-full border border-border/40 group-hover:border-primary/30 transition-all duration-300 bg-card/80">
                <p className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  Tu délègues, on s'acharne, tu emménages. 🏠
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
