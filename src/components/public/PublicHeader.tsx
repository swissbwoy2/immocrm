import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Plus, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { href: '/annonces', label: 'Accueil' },
    { href: '/annonces/recherche?type=location', label: 'Louer' },
    { href: '/annonces/recherche?type=vente', label: 'Acheter' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/annonces" className="flex items-center gap-2">
            <img src={logoImmoRama} alt="Immo-Rama" className="h-8 w-auto" />
            <span className="font-bold text-lg hidden sm:inline">Annonces</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/annonces/recherche">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
            </Link>
            <Link to="/inscription-annonceur">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Déposer une annonce
              </Button>
            </Link>
            <Link to="/connexion-annonceur">
              <Button size="sm">
                <User className="h-4 w-4 mr-2" />
                Connexion
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-6 mt-6">
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="border-t pt-6 flex flex-col gap-3">
                  <Link to="/annonces/recherche" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <Search className="h-4 w-4 mr-2" />
                      Rechercher
                    </Button>
                  </Link>
                  <Link to="/inscription-annonceur" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Déposer une annonce
                    </Button>
                  </Link>
                  <Link to="/connexion-annonceur" onClick={() => setIsOpen(false)}>
                    <Button className="w-full justify-start">
                      <LogIn className="h-4 w-4 mr-2" />
                      Connexion
                    </Button>
                  </Link>
                </div>

                <div className="border-t pt-6">
                  <Link to="/" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
                    ← Retour au site principal
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}