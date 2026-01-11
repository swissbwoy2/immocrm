import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logoImmoRama} alt="Immo-Rama" className="h-8 w-auto invert" />
              <span className="font-bold text-lg">Annonces</span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm mb-4">
              Le portail immobilier de référence en Suisse romande. Trouvez ou publiez votre bien en quelques clics.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/annonces" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/annonces/recherche?type=location" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Louer un bien
                </Link>
              </li>
              <li>
                <Link to="/annonces/recherche?type=vente" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Acheter un bien
                </Link>
              </li>
              <li>
                <Link to="/inscription-annonceur" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Déposer une annonce
                </Link>
              </li>
            </ul>
          </div>

          {/* For Advertisers */}
          <div>
            <h4 className="font-semibold mb-4">Annonceurs</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/inscription-annonceur" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link to="/connexion-annonceur" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link to="/espace-annonceur" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Mon espace
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Retour au site principal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-sidebar-foreground/70">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Chemin de l'Esparcette 5<br />1023 Crissier</span>
              </li>
              <li className="flex items-center gap-2 text-sidebar-foreground/70">
                <Phone className="h-4 w-4 shrink-0" />
                <a href="tel:+41216259505" className="hover:text-sidebar-foreground transition-colors">
                  021 625 95 05
                </a>
              </li>
              <li className="flex items-center gap-2 text-sidebar-foreground/70">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:info@immo-rama.ch" className="hover:text-sidebar-foreground transition-colors">
                  info@immo-rama.ch
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-sidebar-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-sidebar-foreground/60">
          <p>© {currentYear} Immo-Rama. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-sidebar-foreground transition-colors">
              Mentions légales
            </Link>
            <Link to="#" className="hover:text-sidebar-foreground transition-colors">
              Politique de confidentialité
            </Link>
            <Link to="#" className="hover:text-sidebar-foreground transition-colors">
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}