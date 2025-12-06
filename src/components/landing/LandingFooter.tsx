import { Link } from 'react-router-dom';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img src={logoImmoRama} alt="Immo-Rama" className="h-10 w-auto" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Logisorama est votre partenaire de confiance pour trouver le bien immobilier idéal en Suisse romande. 
              Nous vous accompagnons à chaque étape de votre recherche.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>🇨🇭</span>
              <span>Application fièrement suisse</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/nouveau-mandat" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Activer ma recherche
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Se connecter
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:contact@immo-rama.ch" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Nous contacter
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:contact@immo-rama.ch" className="hover:text-primary transition-colors">
                  contact@immo-rama.ch
                </a>
              </li>
              <li>
                <a href="tel:+41218020111" className="hover:text-primary transition-colors">
                  +41 21 802 01 11
                </a>
              </li>
              <li>Suisse Romande</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Immo-Rama.ch - Tous droits réservés
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Mentions légales
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
