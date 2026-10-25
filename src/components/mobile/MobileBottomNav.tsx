import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Calendar, Home, Mailbox, Menu, LifeBuoy, Bell, FileText, FileCheck, Inbox, Banknote } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClientParcours } from '@/hooks/useClientParcours';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  /** Pastille de compteur (barre client uniquement). */
  badgeKey?: 'offres' | 'agenda' | null;
}

/** La barre « bulle » flottante (4 onglets) : chercheur de logement et acheteur, même expérience. */
export function isClientGlassNav(role: string | null, parcours?: string | null): boolean {
  if (role !== 'client') return false;
  return !['relouer', 'renovation', 'vente'].includes(parcours ?? '');
}

export function getBottomNavItems(role: string | null, parcours?: string | null): BottomNavItem[] {
  // Client : la barre du bas suit le parcours (même règle que le menu latéral).
  if (role === 'client') {
    if (parcours === 'achat') {
      // Acheteur : même barre que la location, dans l'ordre du parcours d'achat.
      // Messagerie et menu complet restent accessibles depuis l'en-tête.
      return [
        { name: 'Accueil', icon: Home, path: '/client', badgeKey: null },
        { name: 'Biens', icon: Inbox, path: '/client/biens-proposes', badgeKey: 'offres' },
        { name: 'Financement', icon: Banknote, path: '/client/financement', badgeKey: null },
        { name: 'Agenda', icon: Calendar, path: '/client/calendrier', badgeKey: 'agenda' },
      ];
    }
    if (parcours === 'relouer' || parcours === 'renovation' || parcours === 'vente') {
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/client' },
        { name: 'Messages', icon: MessageSquare, path: '/client/messagerie' },
        { name: 'Alertes', icon: Bell, path: '/client/notifications' },
        { name: 'Support', icon: LifeBuoy, path: '/support' },
      ];
    }
  }
  switch (role) {
    case 'admin':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/admin' },
        { name: 'Postulations', icon: Mailbox, path: '/admin/postulations' },
        { name: 'Messages', icon: MessageSquare, path: '/admin/messagerie' },
        { name: 'Agenda', icon: Calendar, path: '/admin/calendrier' },
        { name: 'Support', icon: LifeBuoy, path: '/admin/support' },
      ];
    case 'agent':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/agent' },
        { name: 'Postulations', icon: Mailbox, path: '/agent/postulations' },
        { name: 'Messages', icon: MessageSquare, path: '/agent/messagerie' },
        { name: 'Agenda', icon: Calendar, path: '/agent/calendrier' },
        { name: 'Support', icon: LifeBuoy, path: '/agent/support' },
      ];
    case 'client':
      // Chercheur de logement : 4 onglets, dans l'ordre du parcours.
      // Messagerie et menu complet restent accessibles depuis l'en-tête.
      return [
        { name: 'Accueil', icon: Home, path: '/client', badgeKey: null },
        { name: 'Offres', icon: Inbox, path: '/client/offres-recues', badgeKey: 'offres' },
        { name: 'Candidatures', icon: FileCheck, path: '/client/mes-candidatures', badgeKey: null },
        { name: 'Agenda', icon: Calendar, path: '/client/calendrier', badgeKey: 'agenda' },
      ];
    case 'candidat':
      return [
        { name: 'Accueil', icon: LayoutDashboard, path: '/candidat' },
        { name: 'Candidatures', icon: FileText, path: '/candidat/candidatures' },
        { name: 'Messages', icon: MessageSquare, path: '/candidat/messages' },
        { name: 'Agenda', icon: Calendar, path: '/candidat/agenda' },
        { name: 'Support', icon: LifeBuoy, path: '/candidat/support' },
      ];
    default:
      return [];
  }
}

export function MobileBottomNav({ role, badges }: { role: string | null; badges?: { offres?: number; agenda?: number } }) {
  const parcours = useClientParcours(role === 'client');
  const items = getBottomNavItems(role, parcours);
  const { setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  const isActive = (path: string) =>
    path.split('/').length === 2 ? pathname === path : pathname.startsWith(path);

  // Client chercheur : bulle flottante translucide (verre dépoli), 4 onglets.
  if (isClientGlassNav(role, parcours)) {
    return (
      <nav
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 lg:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        aria-label="Navigation principale"
      >
        <div className="imr-glass-nav pointer-events-auto flex w-full max-w-[420px] items-stretch gap-1 rounded-full p-1.5">
          {items.map((item) => {
            const active = isActive(item.path);
            const count = item.badgeKey ? badges?.[item.badgeKey] ?? 0 : 0;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium tracking-tight transition-colors duration-200 active:scale-[0.96]',
                  active ? 'text-primary' : 'text-neutral-500 dark:text-neutral-400',
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={count > 0 ? `${item.name} (${count})` : item.name}
              >
                {active && (
                  <motion.span
                    layoutId="imr-client-tab-pill"
                    className="absolute inset-0 rounded-full bg-primary/[0.12]"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
                    aria-hidden
                  />
                )}
                <span className="relative">
                  <item.icon className={cn('h-[22px] w-[22px]', active ? 'stroke-[2.25]' : 'stroke-[1.75]')} />
                  {count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-white dark:ring-neutral-900">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </span>
                <span className="relative max-w-full truncate px-1">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navigation principale"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
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
