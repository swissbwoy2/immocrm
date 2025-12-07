import { Briefcase, ArrowRight, Users, Building2, Sparkles } from 'lucide-react';

export function DifferentiationSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-primary/5 to-muted/20" />
      
      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-[10%] w-40 h-40 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-[10%] w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 right-[20%] w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Decorative lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
        <div className="absolute top-1/2 right-0 w-1/3 h-px bg-gradient-to-l from-transparent via-primary/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon with glow */}
          <div className="animate-fade-in mb-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30 flex items-center justify-center group hover:scale-105 transition-transform">
                <Briefcase className="h-10 w-10 text-primary-foreground" />
              </div>
              {/* Animated glow ring */}
              <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 blur-xl opacity-40 animate-pulse" />
              {/* Sparkles around icon */}
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-primary animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Main message with shine effect */}
          <div className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Immo-Rama.ch n'est pas une agence immobilière{' '}
              <span className="gradient-text-animated">comme les autres</span>
            </h2>
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite]" />
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
            Nous travaillons <span className="text-primary font-semibold">POUR toi</span>, avec les régies et les propriétaires.
          </p>

          {/* Visual representation with premium styling */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* You */}
            <div className="flex flex-col items-center gap-2 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                {/* Glow on hover */}
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-semibold text-foreground">Toi</span>
            </div>

            {/* Arrow 1 */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
                {/* Gradient trail */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent blur-sm -z-10 scale-x-150 origin-left" />
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
            </div>

            {/* Immo-Rama - Central element with enhanced effects */}
            <div className="flex flex-col items-center gap-2 group">
              <div className="relative">
                {/* Pulsing outer ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
                {/* Main circle */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary shadow-lg shadow-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-bold text-primary-foreground">IR</span>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                {/* Sparkles */}
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
              </div>
              <span className="font-bold text-primary">Immo-Rama</span>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <ArrowRight className="h-6 w-6 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent blur-sm -z-10 scale-x-150 origin-left" />
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Régies */}
            <div className="flex flex-col items-center gap-2 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 border-2 border-border flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all">
                  <Building2 className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-muted/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-semibold text-foreground">Régies & Propriétaires</span>
            </div>
          </div>

          {/* Bottom tagline with animated border */}
          <div className="mt-10 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="inline-block relative group">
              <p className="text-lg text-muted-foreground px-6 py-3 glass-morphism rounded-full">
                Tu nous délègues ta recherche, on fait le reste.
              </p>
              {/* Animated border on hover */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 animate-gradient-x blur-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
