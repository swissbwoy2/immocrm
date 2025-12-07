import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-background" />
      <div className="absolute inset-0 mesh-gradient opacity-20" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-20 left-[10%] w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 right-[15%] w-32 h-32 bg-gradient-to-tr from-primary/8 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-pulse"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Top gradient line - animated */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-gradient-x" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4 group relative">
              <img 
                src={logoImmoRama} 
                alt="Immo-Rama" 
                className="h-12 w-auto group-hover:scale-105 transition-transform" 
              />
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              Logisorama est votre partenaire de confiance pour trouver le bien immobilier idéal en Suisse romande. 
              Nous vous accompagnons à chaque étape de votre recherche.
            </p>
            <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 text-sm text-muted-foreground relative overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="text-xl">🇨🇭</span>
              <span>Application fièrement suisse</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              Liens rapides
              <Sparkles className="h-3 w-3 text-primary/50" />
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/nouveau-mandat" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group relative"
                >
                  <span className="relative">
                    Activer ma recherche
                    {/* Underline effect */}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group relative"
                >
                  <span className="relative">
                    Se connecter
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.immo-rama.ch" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1.5 group"
                >
                  <span className="relative">
                    www.immo-rama.ch
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group relative"
                >
                  <span className="relative">
                    Nous contacter
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              Contact
              <Sparkles className="h-3 w-3 text-primary/50" />
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all">📧</span>
                  <span className="relative">
                    contact@immo-rama.ch
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              </li>
              <li>
                <a 
                  href="tel:+41218020111" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all">📞</span>
                  <span className="relative">
                    +41 21 802 01 11
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-2 group">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all">📍</span>
                Suisse Romande
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with animated gradient separator */}
        <div className="relative pt-8">
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Immo-Rama.ch - Tous droits réservés
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors relative group"
              >
                <span className="relative">
                  Mentions légales
                  <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                </span>
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors relative group"
              >
                <span className="relative">
                  Politique de confidentialité
                  <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
