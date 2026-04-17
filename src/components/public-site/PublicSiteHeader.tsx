import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, Menu, LogIn } from 'lucide-react';
import logo from '@/assets/logo-immo-rama-new.png';
import { PublicSiteMenu } from './PublicSiteMenu';

export function PublicSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: hamburger + logo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
                <Link to="/" className="flex items-center" aria-label="Accueil Immo-Rama">
                  <img src={logo} alt="Immo-Rama" className="h-8 w-auto" />
                </Link>
              </div>

              {/* Right: CTAs */}
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="border-border/50">
                  <Link to="/login">
                    <LogIn className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Mon espace client</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"
                >
                  <Link to="/nouveau-mandat">
                    <Rocket className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Activer ma recherche</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <PublicSiteMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
