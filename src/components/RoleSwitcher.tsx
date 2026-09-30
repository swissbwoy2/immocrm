import { useNavigate } from 'react-router-dom';
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
