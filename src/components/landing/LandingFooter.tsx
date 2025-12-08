import { Link } from "react-router-dom";
import { ExternalLink, Heart } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-background" />

      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-20 left-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-20 right-[15%] w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-12 md:mb-16">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-5 group relative">
              <img
                src={logoImmoRama}
                alt="Immo-Rama"
                className="h-12 w-auto group-hover:scale-105 transition-transform"
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4 leading-relaxed">
              <a
                href="https://www.immo-rama.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Immo-Rama.ch
              </a>{" "}
              – Agence immobilière - Gestion - Vente - Construction et rénovation
            </p>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              Logisorama, votre partenaire de confiance pour trouver le bien immobilier idéal en Suisse romande.
            </p>
            <div className="inline-flex items-center gap-2">
              <div className="relative glass-morphism rounded-full px-4 py-2 text-sm text-muted-foreground border border-border/40 bg-card/80">
                <span className="text-xl mr-2">🇨🇭</span>
                <span>🇨🇭 Application fièrement Suisse</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-5">Liens rapides</h4>
            <ul className="space-y-3">
              {[
                { to: "/nouveau-mandat", label: "Activer ma recherche" },
                { to: "/login", label: "Se connecter" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">
                      →
                    </span>
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
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@immo-rama.ch"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group"
                >
                  <span className="relative">
                    Nous contacter
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">
                    →
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-5">Contact</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:info@immo-rama.ch"
                  className="hover:text-primary transition-colors inline-flex items-center gap-3 group"
                >
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-all">
                    📧
                  </span>
                  <span className="relative">
                    info@immo-rama.ch
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                  </span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">📍</span>
                <div className="flex flex-col">
                  <span>Chemin de L'Esparcette 5</span>
                  <span>1023 Crissier</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>© {currentYear} Immo-Rama.ch</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline text-xs">IDE: CHE-442.303.796</span>
              <span className="hidden sm:inline">-</span>
              <span className="hidden sm:inline">Fait avec</span>
              <Heart className="h-3 w-3 text-primary hidden sm:inline-block" />
              <span className="hidden sm:inline">en Suisse</span>
            </p>

            <div className="flex items-center gap-6 text-sm">
              {["Mentions légales", "Politique de confidentialité"].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors relative group"
                >
                  <span className="relative">
                    {label}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
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
