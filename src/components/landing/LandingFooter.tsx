import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles, Star, Heart } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-background" />
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-20 left-[10%] w-48 h-48 bg-gradient-to-br from-primary/12 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 right-[15%] w-40 h-40 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 right-[5%] w-32 h-32 bg-gradient-to-l from-purple-500/8 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Floating sparkles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/30 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
        {[...Array(3)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${30 + Math.random() * 40}%`,
              left: `${20 + Math.random() * 60}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/20 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.7}s` }}
            />
          </div>
        ))}
      </div>
      
      {/* Top animated gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-gradient-x" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-12 md:mb-16">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-5 group relative">
              {/* Permanent subtle glow */}
              <div className="absolute -inset-2 bg-primary/10 blur-lg rounded-lg opacity-60 group-hover:opacity-100 transition-opacity" />
              <img 
                src={logoImmoRama} 
                alt="Immo-Rama" 
                className="h-12 w-auto group-hover:scale-105 transition-transform relative z-10" 
              />
              <Sparkles className="absolute -top-1 -right-2 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              Logisorama est votre partenaire de confiance pour trouver le bien immobilier idéal en Suisse romande. 
              Nous vous accompagnons à chaque étape de votre recherche.
            </p>
            <div className="inline-flex items-center gap-2 relative group">
              {/* Glow behind badge */}
              <div className="absolute -inset-1 bg-primary/15 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass-morphism rounded-full px-4 py-2 text-sm text-muted-foreground overflow-hidden border border-border/30 group-hover:border-primary/30 transition-all">
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="text-xl mr-2">🇨🇭</span>
                <span className="relative z-10">Application fièrement suisse</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 flex items-center gap-2">
              Liens rapides
              <Sparkles className="h-3 w-3 text-primary/50 animate-pulse" />
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/nouveau-mandat', label: 'Activer ma recherche' },
                { to: '/login', label: 'Se connecter' },
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group relative"
                  >
                    <span className="relative">
                      {link.label}
                      {/* Animated underline effect */}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">→</span>
                  </Link>
                </li>
              ))}
              <li>
                <a 
                  href="https://www.immo-rama.ch" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1.5 group"
                >
                  <span className="relative">
                    www.immo-rama.ch
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
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
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">→</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 flex items-center gap-2">
              Contact
              <Sparkles className="h-3 w-3 text-primary/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-3 group"
                >
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all shadow-sm">📧</span>
                  <span className="relative">
                    contact@immo-rama.ch
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              </li>
              <li>
                <a 
                  href="tel:+41218020111" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-3 group"
                >
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all shadow-sm">📞</span>
                  <span className="relative">
                    +41 21 802 01 11
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all shadow-sm">📍</span>
                <span>Suisse Romande</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with animated gradient separator */}
        <div className="relative pt-8">
          {/* Animated gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-gradient-x" style={{ animationDuration: '3s' }} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright with glass morphism */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-primary/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="relative text-sm text-muted-foreground flex items-center gap-2 px-3 py-1 rounded-full">
                © {currentYear} Immo-Rama.ch
                <span className="hidden sm:inline">-</span>
                <span className="hidden sm:inline">Fait avec</span>
                <Heart className="h-3 w-3 text-primary animate-pulse hidden sm:inline-block" />
                <span className="hidden sm:inline">en Suisse</span>
              </p>
            </div>
            
            {/* Legal links */}
            <div className="flex items-center gap-6 text-sm">
              {['Mentions légales', 'Politique de confidentialité'].map((label) => (
                <a 
                  key={label}
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors relative group"
                >
                  <span className="relative">
                    {label}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
