import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Shield, Users, Sparkles } from 'lucide-react';
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
          {/* Logo with glow effect */}
          <div className="animate-fade-in mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-50" />
            <img 
              src={logoImmoRama} 
              alt="Immo-Rama" 
              className="h-20 md:h-28 w-auto drop-shadow-2xl relative z-10"
            />
          </div>

          {/* Animated gradient title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <span className="gradient-text-animated">
              Logisorama
            </span>
          </h1>

          {/* Tagline with subtle animation */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl animate-fade-in leading-relaxed" style={{ animationDelay: '200ms' }}>
            Votre partenaire pour trouver le{' '}
            <span className="text-primary font-semibold relative">
              bien immobilier idéal
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            </span>{' '}
            en Suisse romande
          </p>

          {/* Feature badges with glassmorphism */}
          <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {[
              { icon: Search, text: 'Recherche personnalisée' },
              { icon: Users, text: 'Agent dédié' },
              { icon: Shield, text: 'Dossier sécurisé' },
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 glass-morphism rounded-full px-5 py-2.5 card-shine group cursor-default"
              >
                <feature.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTAs with enhanced styling */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Button 
              asChild 
              size="lg" 
              className="group text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 glow-breathe relative overflow-hidden"
            >
              <Link to="/nouveau-mandat">
                <Sparkles className="mr-2 h-5 w-5" />
                Activer ma recherche
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 glass-morphism border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
            >
              <Link to="/login">
                Se connecter
              </Link>
            </Button>
          </div>

          {/* Trust indicator with animation */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: '500ms' }}>
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
