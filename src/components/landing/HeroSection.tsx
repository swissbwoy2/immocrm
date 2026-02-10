import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, CheckCircle, ShieldCheck, Users, Crown, Home, Key, Lock, FileSearch } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";
import heroBg from "@/assets/hero-bg.jpg";
import { useSearchType } from "@/contexts/SearchTypeContext";

export function HeroSection() {
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();

  const content = {
    location: {
      headline: "Tu n'es plus seul face à la",
      headlineAccent: "pénurie de logements !",
      subheadline: "Délègue ta recherche à",
      subheadlineAccent: "des experts dévoués qui connaissent parfaitement ta région",
      techLine: "🏠 On te trouve ton appart' aujourd'hui !",
      promise: "90 jours ou remboursé intégralement",
      cta: "Commencer ma recherche gratuitement",
      ctaLink: "/nouveau-mandat",
      acompte: "Acompte 300 CHF",
      garantie: "90 jours garantis",
      refund: "Remboursé si échec",
      familiesText: "+500 familles accompagnées",
      legalMention: "🇨🇭 Service premium • Mandat de 90 jours • Transparence totale",
    },
    achat: {
      headline: "Trouve ton bien idéal",
      headlineAccent: "avant qu'il soit sur le marché",
      subheadline: "Accès exclusif à",
      subheadlineAccent: "des biens off-market dans ta région",
      techLine: "🏡 Commission: 1% du prix d'achat (acompte déduit)",
      promise: "6 mois de recherche • Remboursé si échec",
      cta: "Trouver mon bien idéal",
      ctaLink: "/nouveau-mandat",
      acompte: "Acompte 2'500 CHF",
      garantie: "Mandat de 6 mois",
      refund: "Acompte déduit de la commission",
      familiesText: "+150 biens vendus",
      legalMention: "🇨🇭 Service premium • Commission 1% • Remboursé après 6 mois sans succès",
    },
  };

  const c = isAchat ? content.achat : content.location;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroBg} 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/95" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
      {/* N°1 Badge */}
          <div className="animate-fade-in mb-2 md:mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-3 py-1.5 md:px-5 md:py-2.5">
              <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
              <span className="text-xs md:text-base font-semibold text-amber-500">
                ⭐ Chasseur immobilier N°1 en Suisse romande
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="animate-fade-in mb-2 md:mb-4" style={{ animationDelay: "50ms" }}>
            <img src={logoImmoRama} alt="Immo-Rama" className="h-16 md:h-32 w-auto drop-shadow-2xl" />
          </div>

          {/* Slogan */}
          <div className="animate-fade-in mb-3 md:mb-6" style={{ animationDelay: "75ms" }}>
            <span className="text-base md:text-xl font-semibold text-primary tracking-wide">L'immobilier accessible</span>
          </div>

          {/* TYPE SELECTOR */}
          <div className="animate-fade-in mb-3 md:mb-6 w-full max-w-md" style={{ animationDelay: "85ms" }}>
            <div className="flex rounded-xl border-2 border-primary/30 bg-background/80 backdrop-blur-sm p-1 gap-1">
              <button
                onClick={() => setSearchType('location')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isLocation || !searchType
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                }`}
              >
                <Key className="h-5 w-5" />
                <span>Je cherche à louer</span>
              </button>
              <button
                onClick={() => setSearchType('achat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isAchat
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>Je cherche à acheter</span>
              </button>
            </div>
          </div>

          {/* Headline */}
          <h1 
            className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 animate-fade-in text-foreground" 
            style={{ animationDelay: "100ms" }}
          >
            {c.headline} <span className="text-primary">{c.headlineAccent}</span>
          </h1>

          {/* Subheadline */}
          <p 
            className="text-base md:text-2xl font-semibold mb-2 md:mb-3 animate-fade-in text-foreground" 
            style={{ animationDelay: "125ms" }}
          >
            {c.subheadline}{" "}
            <span className="text-primary">
              {c.subheadlineAccent}
            </span>
          </p>

          {/* Tech line */}
          <p 
            className="text-sm md:text-lg text-primary font-medium mb-2 md:mb-4 animate-fade-in" 
            style={{ animationDelay: "140ms" }}
          >
            {c.techLine}
          </p>

          {/* Empathic subheadline */}
          <p 
            className="text-sm md:text-lg text-muted-foreground mb-4 md:mb-6 max-w-2xl animate-fade-in leading-relaxed" 
            style={{ animationDelay: "150ms" }}
          >
            Nos experts cherchent, sélectionnent et contactent {isAchat ? 'les vendeurs' : 'les régies'} pour toi, afin de{" "}
            <strong className="text-foreground">maximiser tes chances de trouver plus vite et mieux</strong>.
          </p>

          {/* Promise box */}
          <div className="animate-fade-in mb-4 md:mb-8" style={{ animationDelay: "200ms" }}>
            <div className="rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 border-2 border-green-500/50 bg-green-500/10 shadow-lg">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                <span className="text-base md:text-2xl font-bold text-foreground">
                  {c.promise}
                </span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            {/* PRIMARY CTA */}
            <Button 
              asChild 
              size="lg" 
              className="group text-base md:text-2xl px-8 md:px-14 py-5 md:py-9 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              <Link to={c.ctaLink}>
                <Rocket className="mr-3 h-6 w-6 md:h-7 md:w-7" />
                <span className="font-bold">{c.cta}</span>
                <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>

            {/* Sans engagement badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-green-500" />
              <span>Sans engagement • Aucune carte de crédit requise</span>
            </div>

            {/* Secondary CTA */}
            <Button 
              asChild 
              variant="outline"
              size="lg" 
              className="group text-sm md:text-base px-6 md:px-8 py-4 md:py-5 border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <a href="#quickform">
                <span>Tester le service gratuitement pendant 24h</span>
              </a>
            </Button>

            {/* CTA Analyse de solvabilité */}
            <Button 
              asChild 
              variant="outline"
              size="lg" 
              className="group text-sm md:text-base px-6 md:px-8 py-4 md:py-5 border-2 border-green-500/40 hover:border-green-500 hover:bg-green-500/5 text-green-600 hover:text-green-700 transition-all duration-300"
            >
              <a href="#analyse-dossier">
                <FileSearch className="mr-2 h-5 w-5" />
                <span>Analyse gratuite de solvabilité</span>
              </a>
            </Button>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                {c.acompte}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                {c.garantie}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                {c.refund}
              </span>
            </div>
          </div>

          {/* Login link */}
          <div className="mt-4 animate-fade-in" style={{ animationDelay: "350ms" }}>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/login">Déjà client ? Se connecter</Link>
            </Button>
          </div>

          {/* Trust block */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Families count */}
              <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/40">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">{c.familiesText}</span> avec succès
                </span>
              </div>
            </div>

            {/* Legal mention */}
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>{c.legalMention}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-7 h-12 border-2 border-primary/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
