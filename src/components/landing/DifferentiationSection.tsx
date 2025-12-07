import { Briefcase, ArrowRight, Users, Building2 } from 'lucide-react';

export function DifferentiationSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-primary/5 to-muted/20" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute top-1/2 right-0 w-1/3 h-px bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="animate-fade-in mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30">
              <Briefcase className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          {/* Main message */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            Immo-Rama.ch n'est pas une agence immobilière{' '}
            <span className="gradient-text-animated">comme les autres</span>
          </h2>

          <p className="text-xl md:text-2xl text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
            Nous travaillons <span className="text-primary font-semibold">POUR toi</span>, avec les régies et les propriétaires.
          </p>

          {/* Visual representation */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* You */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Toi</span>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center">
              <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
            </div>

            {/* Immo-Rama */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary shadow-lg shadow-primary/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">IR</span>
              </div>
              <span className="font-bold text-primary">Immo-Rama</span>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center">
              <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
            </div>

            {/* Régies */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 border-2 border-border flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <span className="font-semibold text-foreground">Régies & Propriétaires</span>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="mt-10 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <p className="text-lg text-muted-foreground">
              Tu nous délègues ta recherche, on fait le reste.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
