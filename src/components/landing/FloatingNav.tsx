import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import logo from '@/assets/logo-immo-rama-new.png';

export function FloatingNav() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            <Link 
              to="/" 
              className="flex items-center gap-2"
              aria-label="Retour à l'accueil Immo-Rama"
            >
              <img 
                src={logo} 
                alt="Logo Immo-Rama" 
                className="h-8 w-auto"
              />
            </Link>

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
  );
}
