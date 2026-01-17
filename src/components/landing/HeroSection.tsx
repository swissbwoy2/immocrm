import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star, Rocket, CheckCircle, ShieldCheck, Users, Crown } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";
import { FloatingParticles } from "@/components/messaging/FloatingParticles";

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
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: "4s" }} 
        />
        <div 
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: "6s", animationDelay: "1s" }} 
        />
        <div 
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-primary/25 to-transparent rounded-full blur-2xl animate-pulse hidden md:block" 
          style={{ animationDuration: "5s", animationDelay: "2s" }} 
        />

        {/* Sparkle particles - hidden on mobile */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="absolute hidden md:block" 
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`
            }}
          >
            <Sparkles 
              className="h-4 w-4 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s` }} 
            />
          </div>
        ))}

        {/* Geometric shapes - hidden on mobile */}
        <div 
          className="absolute top-[25%] left-[10%] w-20 h-20 border border-primary/30 rounded-xl rotate-45 animate-spin hidden lg:block" 
          style={{ animationDuration: "20s" }} 
        />
        <div 
          className="absolute bottom-[25%] right-[10%] w-16 h-16 border border-primary/20 rounded-full animate-spin hidden lg:block" 
          style={{ animationDuration: "15s", animationDirection: "reverse" }} 
        />
        <div 
          className="absolute top-[15%] right-[20%] w-12 h-12 bg-gradient-to-br from-primary/20 to-transparent rounded-lg rotate-12 animate-bounce hidden lg:block" 
          style={{ animationDuration: "3s" }} 
        />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* N°1 Badge - Premium with shine effect */}
          <div className="animate-fade-in mb-4">
            <div className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-5 py-2.5 overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Crown className="h-5 w-5 text-amber-500 animate-pulse" />
              <span className="text-sm md:text-base font-semibold text-amber-500 relative z-10">
                ⭐ N°1 en Suisse romande du House Hunting
              </span>
            </div>
          </div>

          {/* Logo with enhanced glow */}
          <div className="animate-fade-in mb-4 relative" style={{ animationDelay: "50ms" }}>
            <div 
              className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150 opacity-60 animate-pulse" 
              style={{ animationDuration: "3s" }} 
            />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-2xl rounded-full scale-125 animate-pulse" 
              style={{ animationDuration: "4s", animationDelay: "0.5s" }} 
            />
            <img src={logoImmoRama} alt="Immo-Rama" className="h-24 md:h-32 w-auto drop-shadow-2xl relative z-10" />
          </div>

          {/* Slogan - L'immobilier accessible */}
          <div className="animate-fade-in mb-6" style={{ animationDelay: "75ms" }}>
            <span className="text-lg md:text-xl font-semibold text-primary tracking-wide">L'immobilier accessible</span>
          </div>

          {/* Pain point headline - Punchy & Catchy */}
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 animate-fade-in text-foreground" 
            style={{ animationDelay: "100ms" }}
          >
            Tu n'es plus seul face à la <span className="text-primary">pénurie de logements !</span>
          </h1>

          {/* Solution headline - Dynamic */}
          <p 
            className="text-xl md:text-2xl font-semibold mb-3 animate-fade-in text-foreground" 
            style={{ animationDelay: "125ms" }}
          >
            Délègue ta recherche à{" "}
            <span className="gradient-text-animated bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text">
              des experts dévoués qui connaissent parfaitement ta région
            </span>
          </p>

          {/* AI/Tech subtitle - Catchy with emoji */}
          <p 
            className="text-base md:text-lg text-primary font-medium mb-4 animate-fade-in" 
            style={{ animationDelay: "140ms" }}
          >
            🏠 On te trouve ton appart' aujourd'hui !
          </p>

          {/* Empathic subheadline - Tutoiement + Mission */}
          <p 
            className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl animate-fade-in leading-relaxed" 
            style={{ animationDelay: "150ms" }}
          >
            Nos experts cherchent, sélectionnent et contactent les régies pour toi, afin de{" "}
            <strong className="text-foreground">maximiser tes chances de trouver plus vite et mieux</strong>.
          </p>

          {/* Promise box - Premium with animated border - ENHANCED */}
          <div className="animate-fade-in mb-6 md:mb-8 group" style={{ animationDelay: "200ms" }}>
            <div className="relative glass-morphism rounded-xl md:rounded-2xl px-5 md:px-8 py-4 md:py-5 border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 overflow-hidden shadow-lg shadow-green-500/10">
              {/* Animated gradient border */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/30 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center justify-center gap-2 md:gap-3 relative z-10">
                <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                <span className="text-lg md:text-2xl font-bold text-foreground">
                  90 jours ou remboursé intégralement
                </span>
              </div>
            </div>
          </div>

          {/* Double CTA Strategy */}
          <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            {/* PRIMARY CTA - Activer ma recherche → /nouveau-mandat */}
            <Button 
              asChild 
              size="lg" 
              className="group text-lg md:text-2xl px-10 md:px-14 py-7 md:py-9 shadow-2xl shadow-primary/40 hover:shadow-primary/60 transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-primary via-primary to-primary/90 hover:scale-105 animate-pulse-glow"
            >
              <Link to="/nouveau-mandat">
                {/* Shine effect on button */}
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-md ring-2 ring-primary/50 ring-offset-2 ring-offset-background animate-pulse opacity-75" />
                <Rocket className="mr-3 h-6 w-6 md:h-7 md:w-7 relative z-10" />
                <span className="relative z-10 font-bold">Activer ma recherche</span>
                <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 group-hover:translate-x-2 transition-transform relative z-10" />
              </Link>
            </Button>

            {/* Secondary CTA - Shortlist gratuite */}
            <Button 
              asChild 
              variant="outline"
              size="lg" 
              className="group text-sm md:text-base px-6 md:px-8 py-4 md:py-5 border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <a href="#quickform">
                <Sparkles className="mr-2 h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span>Ou recevoir une shortlist gratuite</span>
              </a>
            </Button>

            {/* Micro-copy trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                Acompte 300 CHF
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                90 jours garantis
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                Remboursé si échec
              </span>
            </div>
          </div>

          {/* Secondary - Just login link */}
          <div className="mt-4 animate-fade-in" style={{ animationDelay: "350ms" }}>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/login">Déjà client ? Se connecter</Link>
            </Button>
          </div>

          {/* Trust block - Enhanced with multiple signals */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Google rating */}
              <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 border border-amber-500/30">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">4.8★ sur Google</span>
              </div>

              {/* Families count */}
              <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 border border-border/40">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">+500 familles accompagnées</span> avec succès
                </span>
              </div>
            </div>

            {/* Legal mention */}
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>🇨🇭 Service premium • Mandat de 90 jours • Transparence totale</span>
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
