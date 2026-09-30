import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Repeat, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/** Sélecteur Espace candidat / Espace client — visible seulement avec les deux rôles. */
export function RoleSwitcher() {
  const { userRole, userRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  if (!(userRoles.includes('candidat') && userRoles.includes('client'))) return null;

  const go = (role: 'candidat' | 'client') => {
    switchRole(role);
    navigate(`/${role}`);
  };

  return (
    <div className="px-4 py-2 border-b border-sidebar-border" role="group" aria-label="Changer d'espace">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-sidebar-accent/40 p-1">
        {(['candidat', 'client'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => go(r)}
            aria-pressed={userRole === r}
            className={cn(
              'min-h-[36px] rounded-md text-xs font-medium transition-colors',
              userRole === r ? 'bg-background text-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
            )}
          >
            {r === 'candidat' ? 'Espace candidat' : 'Espace client'}
          </button>
        ))}
      </div>
    </div>
  );
}

const SPACES: { role: string; path: string; label: string }[] = [
  { role: 'admin', path: '/admin', label: 'Espace admin' },
  { role: 'agent', path: '/agent', label: 'Espace agent' },
  { role: 'closeur', path: '/closeur', label: 'Espace closeur' },
  { role: 'coursier', path: '/coursier', label: 'Espace coursier' },
  { role: 'apporteur', path: '/apporteur', label: 'Espace apporteur' },
  { role: 'proprietaire', path: '/proprietaire', label: 'Espace propriétaire' },
  { role: 'client', path: '/client', label: 'Espace client' },
  { role: 'candidat', path: '/candidat', label: 'Espace candidat' },
  { role: 'annonceur', path: '/espace-annonceur', label: 'Espace annonceur' },
];

/**
 * Accès « Mon tableau de bord » + menu « Changer d'espace » (si ≥ 2 espaces).
 * Mono-rôle : simple lien vers son espace.
 */
export function SpaceSwitcher({ className, variant = 'outline' }: { className?: string; variant?: 'outline' | 'ghost' | 'default' }) {
  const { user, userRole, userRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!user) return null;

  const spaces = SPACES.filter((s) => userRoles.includes(s.role as any));
  const current = spaces.find((s) => pathname === s.path || pathname.startsWith(s.path + '/'));
  const home = spaces.find((s) => s.role === userRole && s.role !== 'annonceur')
    || spaces.find((s) => s.role !== 'annonceur') || spaces[0];

  const go = (s: (typeof SPACES)[number]) => {
    if (s.role !== 'annonceur') switchRole(s.role as any);
    navigate(s.path);
  };

  if (spaces.length < 2) {
    return (
      <Button variant={variant} size="sm" className={className} onClick={() => navigate(home?.path || '/espace-annonceur')}>
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Mon tableau de bord
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className={className}>
          <Repeat className="h-4 w-4 mr-2" />
          Changer d'espace
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[100]">
        {home && (
          <>
            <DropdownMenuItem onClick={() => go(home)}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Mon tableau de bord
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Mes espaces</DropdownMenuLabel>
        {spaces.map((s) => (
          <DropdownMenuItem key={s.role} onClick={() => go(s)}>
            <span className="flex-1">{s.label}</span>
            {current?.role === s.role && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
