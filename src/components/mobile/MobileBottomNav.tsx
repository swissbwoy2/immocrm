import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Home, Mailbox, LifeBuoy, Bell, FileText, FileCheck, Inbox, Banknote, Bot, Settings, HardHat, User, Clipboard, UserPlus, Handshake, Wallet, Building2, Users, CalendarCheck, MapPin } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClientParcours } from '@/hooks/useClientParcours';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  /** Pastille de compteur (barre client uniquement). */
  badgeKey?: 'offres' | 'agenda' | null;
}

/**
 * Tous les rôles ont désormais la même barre « bulle » flottante en verre liquide
 * (4 onglets ; 5 pour l'admin et l'agent). Rôle sans onglets : pas de barre.
 */
export function isClientGlassNav(role: string | null, parcours?: string | null): boolean {
  return getBottomNavItems(role, parcours).length > 0;
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
    // Parcours propriétaire (relouer, rénovation, vente) : messagerie et menu complet dans l'en-tête.
    if (parcours === 'relouer') {
      return [
        { name: 'Accueil', icon: Home, path: '/client' },
        { name: 'Alertes', icon: Bell, path: '/client/notifications' },
        { name: 'Support', icon: LifeBuoy, path: '/support' },
        { name: 'Réglages', icon: Settings, path: '/client/parametres' },
      ];
    }
    if (parcours === 'renovation') {
      return [
        { name: 'Accueil', icon: Home, path: '/client' },
        { name: 'Projets', icon: HardHat, path: '/client/renovation' },
        { name: 'Dossier', icon: User, path: '/client/dossier' },
        { name: 'Documents', icon: FileText, path: '/client/documents' },
      ];
    }
    if (parcours === 'vente') {
      return [
        { name: 'Accueil', icon: Home, path: '/client' },
        { name: 'Dossier', icon: User, path: '/client/dossier' },
        { name: 'Documents', icon: FileText, path: '/client/documents' },
        { name: 'Alertes', icon: Bell, path: '/client/notifications' },
      ];
    }
  }
  switch (role) {
    // Admin et agent : même barre que le client, dans l'ordre du travail quotidien.
    // Messagerie et menu complet (dont Support) restent accessibles depuis l'en-tête.
    case 'admin':
    case 'agent': {
      const base = `/${role}`;
      return [
        { name: 'Accueil', icon: Home, path: base },
        { name: 'Offres auto', icon: Bot, path: `${base}/offres-auto` },
        { name: 'Candidatures', icon: FileCheck, path: `${base}/candidatures` },
        { name: 'Postulations', icon: Mailbox, path: `${base}/postulations` },
        { name: 'Agenda', icon: Calendar, path: `${base}/calendrier` },
      ];
    }
    case 'client':
      // Chercheur de logement : 4 onglets, dans l'ordre du parcours.
      // Messagerie et menu complet restent accessibles depuis l'en-tête.
      return [
        { name: 'Accueil', icon: Home, path: '/client', badgeKey: null },
        { name: 'Offres', icon: Inbox, path: '/client/offres-recues', badgeKey: 'offres' },
        { name: 'Candidatures', icon: FileCheck, path: '/client/mes-candidatures', badgeKey: null },
        { name: 'Agenda', icon: Calendar, path: '/client/calendrier', badgeKey: 'agenda' },
      ];
    // Candidat : messages dans l'en-tête.
    case 'candidat':
      return [
        { name: 'Accueil', icon: Home, path: '/candidat' },
        { name: 'Candidatures', icon: FileCheck, path: '/candidat/candidatures' },
        { name: 'Demande', icon: Clipboard, path: '/candidat/demande' },
        { name: 'Agenda', icon: Calendar, path: '/candidat/agenda' },
      ];
    // Apporteur d'affaires : notifications dans l'en-tête.
    case 'apporteur':
      return [
        { name: 'Accueil', icon: Home, path: '/apporteur' },
        { name: 'Soumettre', icon: UserPlus, path: '/apporteur/soumettre-client' },
        { name: 'Referrals', icon: Handshake, path: '/apporteur/mes-referrals' },
        { name: 'Gains', icon: Wallet, path: '/apporteur/commissions' },
      ];
    // Propriétaire : messagerie dans l'en-tête.
    case 'proprietaire':
      return [
        { name: 'Accueil', icon: Home, path: '/proprietaire' },
        { name: 'Mes biens', icon: Building2, path: '/proprietaire/immeubles' },
        { name: 'Locataires', icon: Users, path: '/proprietaire/locataires' },
        { name: 'Agenda', icon: Calendar, path: '/proprietaire/calendrier' },
      ];
    case 'coursier':
      return [
        { name: 'Accueil', icon: Home, path: '/coursier' },
        { name: 'Missions', icon: CalendarCheck, path: '/coursier/missions' },
        { name: 'Carte', icon: MapPin, path: '/coursier/carte' },
        { name: 'Agenda', icon: Calendar, path: '/coursier/calendrier' },
      ];
    default:
      return [];
  }
}

export function MobileBottomNav({ role, badges }: { role: string | null; badges?: { offres?: number; agenda?: number } }) {
  const parcours = useClientParcours(role === 'client');
  const items = getBottomNavItems(role, parcours);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  const isActive = (path: string) =>
    path.split('/').length === 2 ? pathname === path : pathname.startsWith(path);

  // Bulle flottante en verre liquide (tous les rôles).
  return (
      <nav
        className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center lg:hidden', items.length > 4 ? 'px-2.5' : 'px-4')}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        aria-label="Navigation principale"
      >
        <div className={cn('imr-glass-nav pointer-events-auto flex w-full items-stretch rounded-full p-1.5', items.length > 4 ? 'max-w-[460px] gap-0 p-1' : 'max-w-[420px] gap-1')}>
          {items.map((item) => {
            const active = isActive(item.path);
            const count = item.badgeKey ? badges?.[item.badgeKey] ?? 0 : 0;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full font-medium tracking-tight transition-colors duration-200 active:scale-[0.96]',
                  items.length > 4 ? 'text-[10px] tracking-[-0.02em]' : 'text-[11px]',
                  active ? 'text-primary dark:text-emerald-300' : 'text-neutral-600 dark:text-neutral-300',
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={count > 0 ? `${item.name} (${count})` : item.name}
              >
                {active && (
                  <motion.span
                    layoutId="imr-client-tab-pill"
                    className="imr-lg-lens absolute inset-0 rounded-full"
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
                <span className={cn('relative max-w-full truncate', items.length > 4 ? 'px-0' : 'px-1')}>{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
  );
}
