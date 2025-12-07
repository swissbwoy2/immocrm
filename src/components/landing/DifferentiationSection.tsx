import { Briefcase, ArrowRight, Users, Building2, Sparkles, Star, Zap } from 'lucide-react';

export function DifferentiationSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Premium mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-primary/5 to-muted/20" />
      <div className="absolute inset-0 mesh-gradient opacity-40" />
      
      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-[10%] w-48 h-48 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-[10%] w-56 h-56 bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 right-[20%] w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-[5%] w-32 h-32 bg-gradient-to-r from-green-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Floating sparkles and stars - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.3}s` }}
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
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>
      
      {/* Animated decorative lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/2 left-0 w-1/3 h-px overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-gradient-x" />
        </div>
        <div className="absolute top-1/2 right-0 w-1/3 h-px overflow-hidden">
          <div className="h-full w-full bg-gradient-to-l from-transparent via-primary/40 to-transparent animate-gradient-x" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon with enhanced glow */}
          <div className="animate-fade-in mb-8">
            <div className="relative inline-flex items-center justify-center">
              {/* Outer pulsing rings */}
              <div className="absolute w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/60 opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 opacity-30 animate-pulse" style={{ animationDuration: '2s' }} />
              
              {/* Main icon container */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/40 flex items-center justify-center group hover:scale-110 transition-all duration-300 relative z-10">
                <Briefcase className="h-10 w-10 text-primary-foreground" />
              </div>
              
              {/* Glow blur behind icon */}
              <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 blur-xl opacity-50 animate-pulse" />
              
              {/* Sparkles around icon */}
              <Sparkles className="absolute -top-3 -right-3 h-6 w-6 text-primary animate-pulse" />
              <Sparkles className="absolute -bottom-2 -left-2 h-5 w-5 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Star className="absolute top-0 -left-4 h-4 w-4 text-primary/50 animate-float" style={{ animationDelay: '1s' }} />
              <Zap className="absolute -bottom-3 right-0 h-4 w-4 text-primary/60 animate-bounce-soft" />
            </div>
          </div>

          {/* Main message with shine effect */}
          <div className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 relative">
              Immo-Rama.ch n'est pas une agence immobilière{' '}
              <span className="gradient-text-animated relative">
                comme les autres
                <Sparkles className="absolute -top-2 -right-4 h-4 w-4 text-primary animate-pulse hidden md:block" />
              </span>
            </h2>
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite]" />
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
            Nous travaillons <span className="text-primary font-semibold">POUR toi</span>, avec les régies et les propriétaires.
          </p>

          {/* Visual representation with premium styling */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* You */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                {/* Glow ring on hover */}
                <div className="absolute -inset-2 rounded-full bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary flex items-center justify-center group-hover:scale-110 transition-all duration-300 relative">
                  <Users className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                  {/* Sparkle on hover */}
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </div>
              </div>
              <span className="font-semibold text-foreground text-lg">Toi</span>
            </div>

            {/* Arrow 1 with animated gradient trail */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                {/* Gradient trail */}
                <div className="absolute -inset-x-4 inset-y-0 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 blur-md opacity-60 animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="relative flex items-center gap-1">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-primary/50 to-primary rounded-full" />
                  <ArrowRight className="h-7 w-7 text-primary animate-pulse" />
                </div>
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-8 w-8 text-primary rotate-90 animate-bounce-soft" />
            </div>

            {/* Immo-Rama - Central element with enhanced effects */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                {/* Multiple pulsing outer rings */}
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary to-primary/80 opacity-20 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary to-primary/80 opacity-30 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                
                {/* Main circle */}
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary shadow-2xl shadow-primary/40 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl md:text-3xl font-bold text-primary-foreground">IR</span>
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
                
                {/* Orbiting sparkles */}
                <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-primary animate-pulse" />
                <Star className="absolute -bottom-1 -left-2 h-4 w-4 text-primary/70 animate-float" />
                <Zap className="absolute top-1/2 -right-4 h-4 w-4 text-primary/60 animate-bounce-soft" />
              </div>
              <span className="font-bold text-primary text-lg">Immo-Rama</span>
            </div>

            {/* Arrow 2 with animated gradient trail */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <div className="absolute -inset-x-4 inset-y-0 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 blur-md opacity-60 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                <div className="relative flex items-center gap-1">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-primary/50 to-primary rounded-full" />
                  <ArrowRight className="h-7 w-7 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>
              </div>
            </div>
            <div className="md:hidden">
              <ArrowRight className="h-8 w-8 text-primary rotate-90 animate-bounce-soft" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Régies */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-muted/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 border-2 border-border flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300 relative">
                  <Building2 className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </div>
              </div>
              <span className="font-semibold text-foreground text-lg">Régies & Propriétaires</span>
            </div>
          </div>

          {/* Bottom tagline with animated border and glow */}
          <div className="mt-12 md:mt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="inline-block relative group">
              {/* Animated border gradient */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm animate-gradient-x" />
              
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative px-8 py-4 glass-morphism rounded-full border border-border/30 group-hover:border-primary/50 transition-all duration-300 overflow-hidden">
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <p className="text-lg md:text-xl text-muted-foreground group-hover:text-foreground transition-colors relative z-10 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  Tu nous délègues ta recherche, on fait le reste.
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
