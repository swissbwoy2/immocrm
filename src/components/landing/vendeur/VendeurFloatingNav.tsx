import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, Home, Building, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo-immo-rama-new.png';

export function VendeurFloatingNav() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isVendrePage = location.pathname === '/vendre-mon-bien' || location.pathname === '/formulaire-vendeur';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              to="/vendre-mon-bien" 
              className="flex items-center gap-2"
              aria-label="Retour à la page vendeur Immo-Rama"
            >
              <img 
                src={logo} 
                alt="Logo Immo-Rama" 
                className="h-8 w-auto"
              />
            </Link>

            {/* Boutons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Accueil</span>
                </Link>
              </Button>

              <Button
                asChild 
                variant={isVendrePage ? "secondary" : "ghost"}
                size="sm"
                className={isVendrePage 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground"
                }
              >
                <Link to="/vendre-mon-bien">
                  <Building className="h-4 w-4 mr-2" />
                  <span>Vendre</span>
                </Link>
              </Button>
              
              <Button 
                asChild 
                size="sm"
                className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"
              >
                <Link to="/login">
                  <LogIn className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Se connecter</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
