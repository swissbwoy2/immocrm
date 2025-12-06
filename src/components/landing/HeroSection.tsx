import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Shield, Users } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="animate-fade-in mb-8">
            <img 
              src={logoImmoRama} 
              alt="Immo-Rama" 
              className="h-20 md:h-28 w-auto drop-shadow-lg"
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              Logisorama
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
            Votre partenaire pour trouver le{' '}
            <span className="text-primary font-semibold">bien immobilier idéal</span>{' '}
            en Suisse romande
          </p>

          {/* Features badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Recherche personnalisée</span>
            </div>
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Agent dédié</span>
            </div>
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Dossier sécurisé</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Button asChild size="lg" className="group text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/nouveau-mandat">
                Activer ma recherche
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 hover:bg-primary/5 transition-all duration-300">
              <Link to="/login">
                Se connecter
              </Link>
            </Button>
          </div>

          {/* Trust indicator */}
          <p className="mt-12 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '500ms' }}>
            🇨🇭 Service 100% suisse • Plus de 500 clients accompagnés
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
