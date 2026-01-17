import { Link } from 'react-router-dom';
import { ArrowRight, Users, Shield, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VendeurHeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge 0% commission */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 mb-8 animate-fade-in">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold text-lg">0% de commission vendeur</span>
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>

          {/* Main title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <span className="text-foreground">Combien d'acheteurs prêts à acheter</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              votre bien aujourd'hui ?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            Ajoutez votre propriété à notre système de <span className="text-primary font-semibold">matching intelligent</span>. 
            Des centaines de familles et investisseurs avec des critères précis cherchent activement leur futur bien immobilier en Suisse romande. 
            <span className="text-foreground font-medium"> Votre bien correspond-il à leurs attentes ?</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button 
              asChild
              size="lg" 
              className="group text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-2xl shadow-primary/25"
            >
              <a href="#formulaire-vendeur">
                Découvrir mes acheteurs potentiels
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 border-2 hover:bg-primary/5"
            >
              <a href="tel:+41216342839">
                Appeler : 021 634 28 39
              </a>
            </Button>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
            {[
              { icon: Shield, label: '0% commission', sublabel: 'Vendeur' },
              { icon: TrendingUp, label: '100% gardé', sublabel: 'De votre prix' },
              { icon: Users, label: 'Off-market', sublabel: 'Discrétion totale' },
              { icon: Zap, label: 'Vente rapide', sublabel: 'Quelques semaines' },
            ].map((item, index) => (
              <div 
                key={index}
                className="group p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </section>
  );
}
