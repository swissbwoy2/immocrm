import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'Accueil', to: '/' },
  { label: 'Annonces', to: '/annonces' },
  { label: 'Achat-Vente', to: '/vendre-mon-bien' },
  { label: 'Relogement', to: '/relouer-mon-appartement' },
  { label: 'Relocation', to: '/chasseur-appartement' },
  { label: 'Project Management', to: '/construire-renover' },
  { label: 'Rendez-vous', to: '/rendez-vous' },
  { label: 'À propos', to: '/login' },
];

export function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4 lg:px-6">
          <div className="h-20 flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Accueil Immo-Rama">
              <span className="font-serif text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                IMM<span className="text-accent">O</span>-RAMA
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden xl:flex items-center gap-7 text-[11px] uppercase tracking-[0.18em] font-medium">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      active
                        ? 'text-foreground border-b border-foreground pb-1'
                        : 'text-foreground/70 hover:text-foreground transition-colors'
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* CTA + burger */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/vendre-mon-bien"
                className="hidden md:inline-flex items-center px-5 py-3 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-accent transition-colors"
              >
                Estimation gratuite
              </Link>

              <button
                onClick={() => setOpen((v) => !v)}
                className="xl:hidden p-2 -mr-2 text-foreground"
                aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="xl:hidden border-t border-border bg-background">
            <nav className="container mx-auto px-4 py-6 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="py-3 text-sm uppercase tracking-[0.18em] font-medium text-foreground/80 hover:text-foreground border-b border-border last:border-0"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/vendre-mon-bien"
                className="mt-4 inline-flex items-center justify-center px-5 py-4 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-bold hover:bg-accent transition-colors"
              >
                Estimation gratuite
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* spacer so content isn't hidden under fixed header */}
      <div className="h-20" />
    </>
  );
}
