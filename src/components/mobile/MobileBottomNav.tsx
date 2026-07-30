import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Calendar, Home, Mailbox, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  name: string;
  icon: React.ElementType;
  path: string;
}

export function getBottomNavItems(role: string | null): BottomNavItem[] {
  switch (role) {
    case 'admin':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/admin' },
        { name: 'Postulations', icon: Mailbox, path: '/admin/postulations' },
        { name: 'Messages', icon: MessageSquare, path: '/admin/messagerie' },
        { name: 'Agenda', icon: Calendar, path: '/admin/calendrier' },
      ];
    case 'agent':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/agent' },
        { name: 'Postulations', icon: Mailbox, path: '/agent/postulations' },
        { name: 'Messages', icon: MessageSquare, path: '/agent/messagerie' },
        { name: 'Agenda', icon: Calendar, path: '/agent/calendrier' },
      ];
    case 'client':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/client' },
        { name: 'Offres', icon: Home, path: '/client/offres-recues' },
        { name: 'Messages', icon: MessageSquare, path: '/client/messagerie' },
        { name: 'Agenda', icon: Calendar, path: '/client/calendrier' },
      ];
    default:
      return [];
  }
}

export function MobileBottomNav({ role }: { role: string | null }) {
  const items = getBottomNavItems(role);
  const { setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (items.length === 0) return null;

  const isActive = (path: string) =>
    path.split('/').length === 2 ? pathname === path : pathname.startsWith(path);

  return (
    <nav
      className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors active:scale-95',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className="max-w-full truncate">{item.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors active:scale-95"
          aria-label="Ouvrir le menu complet"
        >
          <Menu className="h-5 w-5" />
          <span>Plus</span>
        </button>
      </div>
    </nav>
  );
}
