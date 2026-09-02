import { Link } from 'react-router-dom';
import { ExternalLink, Heart } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PublicSiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-background" />
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-20 left-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 right-[15%] w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-10 mb-12 md:mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-2 group">
              <img src={logoImmoRama} alt="Immo-Rama" className="h-12 w-auto group-hover:scale-105 transition-transform" />
            </Link>
            <p className="text-primary font-semibold text-sm mb-4">L'immobilier accessible</p>
            <p className="text-muted-foreground text-sm max-w-md mb-4 leading-relaxed">
              <a href="https://www.immo-rama.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Immo-Rama.ch</a>{' '}
              – Agence immobilière - Gestion - Vente - Construction et rénovation
            </p>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              ✨ Le coup de pouce que tout le monde mérite dans sa recherche d'appartement. <strong className="text-foreground">Démarre ta recherche maintenant !</strong>
            </p>
            <div className="inline-flex items-center gap-2">
              <div className="relative glass-morphism rounded-full px-4 py-2 text-sm text-muted-foreground border border-border/40 bg-card/80">
                <span className="text-xl mr-2">🇨🇭</span>
                <span>🇨🇭 Application fièrement Suisse</span>
              </div>
            </div>
          </div>

          {/* Recherche d'appartement */}
          <div>
            <h4 className="font-semibold text-foreground mb-5">Recherche d'appartement</h4>
            <ul className="space-y-3">
              {[
                { to: '/nouveau-mandat', label: 'Activer ma recherche' },
                { to: '/chasseur-appartement', label: "Chasseur d'appartement" },
                { to: '/relouer-mon-appartement', label: 'Relouer mon appartement (locataire sortant)' },
                { to: '/rendez-vous', label: 'Prendre rendez-vous' },
                { to: '/login', label: 'Espace client' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
                    <span className="relative">{link.label}<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services propriétaires — externes vers Immo-rama.ch */}
          <div>
            <h4 className="font-semibold text-foreground mb-5">Services propriétaires</h4>
            <ul className="space-y-3">
              {[
                { href: 'https://immo-rama.ch/vendre-mon-bien', label: 'Vendre mon bien' },
                { href: '/relouer-mon-appartement', label: 'Reprise de bail / trouver un repreneur' },
                { href: 'https://immo-rama.ch/project-management', label: 'Project Management' },
                { href: 'https://www.immo-rama.ch', label: 'www.immo-rama.ch' },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1.5 group">
                    <span className="relative">{link.label}<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
              <li>
                <a href="mailto:info@immo-rama.ch" className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
                  <span className="relative">Nous contacter<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary">→</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-5">Contact</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <a href="tel:+41216343161" className="hover:text-primary transition-colors inline-flex items-center gap-3 group">
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-all">📞</span>
                  <span className="relative font-semibold text-foreground">021 634 31 61<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                </a>
              </li>
              <li>
                <a href="mailto:info@immo-rama.ch" className="hover:text-primary transition-colors inline-flex items-center gap-3 group">
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-all">📧</span>
                  <span className="relative">info@immo-rama.ch<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">📍</span>
                <div className="flex flex-col">
                  <span>Chemin de l'Esparcette 5</span>
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
              <span className="hidden sm:inline">en Suisse 🇨🇭</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {[
                { label: 'Mentions légales', to: '/mentions-legales' },
                { label: 'Politique de confidentialité', to: '/politique-confidentialite' },
              ].map((item) => (
                <a key={item.label} href={item.to} className="text-muted-foreground hover:text-primary transition-colors relative group">
                  <span className="relative">{item.label}<span className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" /></span>
                </a>
              ))}
              <button
                type="button"
                onClick={() => import('@/components/CookieConsentBanner').then(m => m.openCookiePreferences())}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Gérer mes cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
