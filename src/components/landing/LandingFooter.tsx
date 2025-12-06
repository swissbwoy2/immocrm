import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-background" />
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4 group">
              <img 
                src={logoImmoRama} 
                alt="Immo-Rama" 
                className="h-12 w-auto group-hover:scale-105 transition-transform" 
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              Logisorama est votre partenaire de confiance pour trouver le bien immobilier idéal en Suisse romande. 
              Nous vous accompagnons à chaque étape de votre recherche.
            </p>
            <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 text-sm text-muted-foreground">
              <span className="text-xl">🇨🇭</span>
              <span>Application fièrement suisse</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Liens rapides</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/nouveau-mandat" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group"
                >
                  Activer ma recherche
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group"
                >
                  Se connecter
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
                  www.immo-rama.ch
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group"
                >
                  Nous contacter
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">📧</span>
                  contact@immo-rama.ch
                </a>
              </li>
              <li>
                <a 
                  href="tel:+41218020111" 
                  className="hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">📞</span>
                  +41 21 802 01 11
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">📍</span>
                Suisse Romande
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with gradient separator */}
        <div className="relative pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Immo-Rama.ch - Tous droits réservés
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Mentions légales
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Politique de confidentialité
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
