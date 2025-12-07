import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, CheckCircle, Shield } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl geo-shape-1" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl geo-shape-2" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-2xl float-particle" />
        
        {/* Floating particles */}
        <div className="absolute top-20 left-[20%] w-4 h-4 bg-primary/30 rounded-full float-particle" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-[30%] w-3 h-3 bg-primary/40 rounded-full float-particle" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[35%] w-5 h-5 bg-primary/25 rounded-full float-particle-delayed" />
        <div className="absolute top-[60%] right-[15%] w-3 h-3 bg-primary/35 rounded-full float-particle" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[30%] left-[15%] w-4 h-4 bg-primary/30 rounded-full float-particle-delayed" style={{ animationDelay: '1s' }} />
        
        {/* Geometric shapes */}
        <div className="absolute top-[25%] left-[10%] w-20 h-20 border border-primary/20 rounded-xl rotate-45 geo-shape-1" />
        <div className="absolute bottom-[25%] right-[10%] w-16 h-16 border border-primary/15 rounded-full geo-shape-2" />
        <div className="absolute top-[15%] right-[20%] w-12 h-12 bg-gradient-to-br from-primary/10 to-transparent rounded-lg rotate-12 float-particle" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Logo with glow effect - larger */}
          <div className="animate-fade-in mb-6 relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-50" />
            <img 
              src={logoImmoRama} 
              alt="Immo-Rama" 
              className="h-28 md:h-36 w-auto drop-shadow-2xl relative z-10"
            />
          </div>

          {/* Guarantee badge - VERY prominent */}
          <div className="animate-fade-in mb-6" style={{ animationDelay: '100ms' }}>
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-2 border-primary/50 rounded-full px-6 py-3 glow-breathe">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-lg md:text-xl font-bold text-primary">
                Acompte remboursé à 100% en cas d'échec*
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">*Après 3 mois de recherches</p>
          </div>
          
          {/* Commission info */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="glass-morphism rounded-full px-4 py-2 border border-border/30">
              <span className="text-muted-foreground">Acompte : </span>
              <span className="font-semibold text-foreground">300 CHF</span>
            </div>
            <div className="glass-morphism rounded-full px-4 py-2 border border-border/30">
              <span className="text-muted-foreground">Succès : </span>
              <span className="font-semibold text-foreground">1 mois de loyer - 300 CHF</span>
            </div>
          </div>

          {/* Tagline with conversion focus */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 animate-fade-in text-foreground" style={{ animationDelay: '200ms' }}>
            Trouvez votre{' '}
            <span className="gradient-text-animated">bien immobilier idéal</span>{' '}
            en Suisse Romande
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl animate-fade-in leading-relaxed" style={{ animationDelay: '250ms' }}>
            Un agent dédié, un réseau d'agences partenaires, un suivi rigoureux de votre dossier
          </p>

          {/* Key benefits - compact */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {[
              'Agent dédié',
              'Délégation de visite',
              'Messagerie directe',
              'Réseau d\'agences',
            ].map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 glass-morphism rounded-full px-4 py-2"
              >
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground/80">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Primary CTA - VERY prominent */}
          <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Button 
              asChild 
              size="lg" 
              className="group text-xl px-10 py-7 shadow-2xl hover:shadow-primary/30 transition-all duration-300 glow-breathe relative overflow-hidden bg-gradient-to-r from-primary to-primary/90"
            >
              <Link to="/nouveau-mandat">
                <Sparkles className="mr-2 h-6 w-6" />
                Activer ma recherche
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Gratuit et sans engagement • Résultat garanti
            </span>
          </div>

          {/* Secondary CTA */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '450ms' }}>
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

          {/* Trust indicator */}
          <div className="mt-10 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <div className="inline-flex items-center gap-3 glass-morphism rounded-full px-6 py-3">
              <span className="text-2xl">🇨🇭</span>
              <span className="text-sm text-muted-foreground">
                Service 100% suisse • <span className="text-primary font-medium">Plus de 500 clients accompagnés</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-7 h-12 border-2 border-primary/30 rounded-full flex justify-center pt-2 glass-morphism">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-primary/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
