import { Link } from 'react-router-dom';
import {
  Menu,
  Home,
  Search,
  Building2,
  CalendarCheck,
  User,
  Rocket,
  ExternalLink,
  Banknote,
  RefreshCw,
  HardHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const internalLinks = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/nouveau-mandat', label: 'Activer ma recherche', icon: Rocket },
  { to: '/chasseur-appartement', label: 'Chasseur d’appartement', icon: Search },
  { to: '/rendez-vous', label: 'Prendre rendez-vous', icon: CalendarCheck },
  { to: '/login', label: 'Espace client', icon: User },
];

const externalProprio = [
  { href: 'https://immo-rama.ch/vendre-mon-bien', label: 'Vendre mon bien', icon: Banknote },
  { href: 'https://immo-rama.ch/relouer-mon-appartement', label: 'Mettre en location', icon: RefreshCw },
  { href: 'https://immo-rama.ch/project-management', label: 'Construire / Project Management', icon: HardHat },
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
      <SheetContent side="right" className="w-[85vw] sm:max-w-sm bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-foreground">Navigation</SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-1">
          {internalLinks.map((link, idx) => {
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

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 px-3">
            Services propriétaires
          </p>
          <nav className="flex flex-col gap-1">
            {externalProprio.map((link, idx) => {
              const Icon = link.icon;
              return (
                <a
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="text-sm flex-1">{link.label}</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              );
            })}
          </nav>
          <p className="text-[10px] text-muted-foreground/70 mt-3 px-3">
            Géré par Immo-rama.ch
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground text-center">
          Logisorama · by Immo-rama.ch
        </div>
      </SheetContent>
    </Sheet>
  );
}
