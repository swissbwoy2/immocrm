import { Link } from 'react-router-dom';
import { Menu, Home, Search, Building, Banknote, RefreshCw, HardHat, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const links = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/', label: 'Acheter / Chercher', icon: Search },
  { to: '/', label: 'Louer', icon: Building },
  { to: '/vendre-mon-bien', label: 'Vendre mon bien', icon: Banknote },
  { to: '/relouer-mon-appartement', label: 'Relouer mon appartement', icon: RefreshCw },
  { to: '/construire-renover', label: 'Construire / Rénover', icon: HardHat },
  { to: '/#contact', label: 'Nous contacter', icon: Phone },
  { to: '/auth', label: 'Espace client', icon: User },
];

interface LandingHamburgerMenuProps {
  className?: string;
}

export function LandingHamburgerMenu({ className }: LandingHamburgerMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] sm:max-w-sm bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-left text-foreground">Navigation</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {links.map((link, idx) => {
            const Icon = link.icon;
            return (
              <SheetClose asChild key={idx}>
                <Link
                  to={link.to}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                >
                  <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground text-center">
          Immo-Rama · Logisorama
        </div>
      </SheetContent>
    </Sheet>
  );
}
