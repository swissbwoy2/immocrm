import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Star, Home, CheckCircle } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />

      {/* Premium floating particles - hidden on mobile */}
      <div className="hidden md:block">
        <FloatingParticles count={20} className="opacity-60" />
      </div>

      {/* Animated orbs - Premium style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large animated orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-primary/25 to-transparent rounded-full blur-2xl animate-pulse hidden md:block" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        
        {/* Sparkle particles - hidden on mobile */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute hidden md:block"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <Sparkles 
              className="h-4 w-4 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s` }}
            />
          </div>
        ))}
        
        {/* Geometric shapes - hidden on mobile */}
        <div className="absolute top-[25%] left-[10%] w-20 h-20 border border-primary/30 rounded-xl rotate-45 animate-spin hidden lg:block" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-[25%] right-[10%] w-16 h-16 border border-primary/20 rounded-full animate-spin hidden lg:block" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
        <div className="absolute top-[15%] right-[20%] w-12 h-12 bg-gradient-to-br from-primary/20 to-transparent rounded-lg rotate-12 animate-bounce hidden lg:block" style={{ animationDuration: '3s' }} />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* N°1 Badge - Premium with shine effect */}
          <div className="animate-fade-in mb-4">
            <div className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-5 py-2.5 overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Star className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
              <span className="text-sm md:text-base font-semibold text-amber-500 relative z-10">N°1 en Suisse romande depuis 2019</span>
            </div>
          </div>

          {/* Logo with enhanced glow */}
          <div className="animate-fade-in mb-6 relative" style={{ animationDelay: '50ms' }}>
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150 opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-2xl rounded-full scale-125 animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
            <img 
              src={logoImmoRama} 
              alt="Immo-Rama" 
              className="h-24 md:h-32 w-auto drop-shadow-2xl relative z-10"
            />
          </div>

          {/* Pain point headline */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 animate-fade-in text-foreground" style={{ animationDelay: '100ms' }}>
            Marre de postuler <span className="text-primary">dans le vide</span> ?
          </h1>
          
          {/* Solution headline */}
          <p className="text-xl md:text-2xl font-semibold mb-4 animate-fade-in text-foreground" style={{ animationDelay: '125ms' }}>
            Délègue ta recherche à des{' '}
            <span className="gradient-text-animated bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text">experts qui s'acharnent pour toi</span>
          </p>

          {/* Empathic subheadline */}
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl animate-fade-in leading-relaxed" style={{ animationDelay: '150ms' }}>
            100 dossiers envoyés, 0 réponse ? On connaît. Nos agents contactent les régies, 
            préparent ton dossier béton et te trouvent <strong className="text-foreground">enfin</strong> ton appartement.
          </p>

          {/* Promise box - Premium with animated border */}
          <div className="animate-fade-in mb-6 md:mb-8 group" style={{ animationDelay: '200ms' }}>
            <div className="relative glass-morphism rounded-xl md:rounded-2xl px-5 md:px-8 py-4 md:py-5 border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 overflow-hidden">
              {/* Animated gradient border */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center justify-center gap-2 md:gap-3 relative z-10">
                <Home className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0 animate-pulse" />
                <span className="text-lg md:text-2xl font-bold text-foreground">
                  Ton appart' en moins de 3 mois ou 100% remboursé !
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA - Premium with glow */}
          <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button 
              asChild 
              size="lg" 
              className="group text-base md:text-xl px-6 md:px-10 py-5 md:py-7 shadow-2xl hover:shadow-primary/40 transition-all duration-300 glow-breathe relative overflow-hidden bg-gradient-to-r from-primary to-primary/90"
            >
              <Link to="/nouveau-mandat">
                {/* Shine effect on button */}
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Sparkles className="mr-2 h-5 w-5 md:h-6 md:w-6 relative z-10" />
                <span className="hidden sm:inline relative z-10">Démarrer ma recherche GRATUITEMENT</span>
                <span className="sm:hidden relative z-10">Démarrer GRATUITEMENT</span>
                <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-2 transition-transform relative z-10" />
              </Link>
            </Button>
            
            {/* Micro-copy trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                Sans engagement
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                300 CHF remboursables
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                1er RDV offert
              </span>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
            <Button 
              asChild 
              variant="ghost" 
              size="lg" 
              className="text-muted-foreground hover:text-foreground"
            >
              <Link to="/login">
                Déjà client ? Se connecter
              </Link>
            </Button>
          </div>

          {/* Trust indicator - Premium with glow */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="relative inline-flex items-center gap-3 glass-morphism rounded-full px-6 py-3 group overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="text-sm text-muted-foreground relative z-10">
                <span className="text-primary font-medium">+500 familles relogées</span> en Suisse romande
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-7 h-12 border-2 border-primary/30 rounded-full flex justify-center pt-2 glass-morphism">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-primary/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
