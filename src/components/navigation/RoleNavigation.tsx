import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, FileEdit, Search, X } from 'lucide-react';
import { filterMenu, isNavigationItemActive, type MenuSection } from '@/lib/sidebarNavigation';
import { NotificationBadge } from '@/components/NotificationBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RoleNavigationProps {
  sections: MenuSection[];
  collapsed?: boolean;
  getCount?: (key: string | null) => number;
  draftPath?: string;
  onNavigate?: () => void;
  label?: string;
}

/** The same destinations and interactions in the desktop rail and mobile drawer. */
export function RoleNavigation({ sections, collapsed = false, getCount = () => 0, draftPath, onNavigate, label = 'Navigation de mon espace' }: RoleNavigationProps) {
  const { pathname } = useLocation();
  const id = useId();
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const hasLongMenu = sections.reduce((total, section) => total + section.items.length, 0) > 25;
  // A desktop filter never hides destinations in the collapsed icon rail.
  const visibleSections = filterMenu(sections, collapsed ? '' : query);

  return (
    <nav aria-label={label} className="min-h-0 px-2 pb-3">
      {!collapsed && (
        <div className="sticky top-0 z-10 bg-sidebar py-3">
          <label htmlFor={`${id}-search`} className="sr-only">Rechercher dans le menu</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-sidebar-foreground/60" />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher une rubrique…"
              className="h-10 w-full rounded-lg border border-sidebar-border bg-sidebar-accent/30 pl-9 pr-9 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery('')} className="absolute right-1 top-1 rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
        </div>
      )}
      {visibleSections.length === 0 && <p role="status" className="px-3 py-6 text-sm text-sidebar-foreground/70">Aucune rubrique trouvée. Essayez un autre mot.</p>}
      {visibleSections.map(section => {
        const sectionIndex = sections.findIndex(candidate => candidate.label === section.label);
        const containsActivePage = section.items.some(item => isNavigationItemActive(pathname, item.path));
        const open = collapsed || !!query.trim() || containsActivePage || (openSections[section.label] ?? (!hasLongMenu || sectionIndex < 2));
        // Several entries may refer to the same counter: count each key once.
        const count = [...new Set(section.items.map(item => item.notifKey).filter(Boolean))].reduce((total, key) => total + getCount(key), 0);
        const containsDraft = section.items.some(item => item.path === draftPath);
        const sectionId = `${id}-section-${sectionIndex}`;

        return (
          <section key={section.label} className={cn('py-1', collapsed && 'border-b border-sidebar-border/60 last:border-0')} aria-label={section.label}>
            {!collapsed && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={sectionId}
                // Keep the active page and search results visible.
                disabled={containsActivePage || !!query.trim()}
                onClick={() => setOpenSections(previous => ({ ...previous, [section.label]: !open }))}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:hover:bg-transparent"
              >
                <span className="flex-1">{section.label}</span>
                {!open && count > 0 && <NotificationBadge count={count} />}
                {!open && containsDraft && <FileEdit aria-label="Brouillon sauvegardé" className="h-3.5 w-3.5 text-orange-500" />}
                <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
              </button>
            )}
            <ul id={sectionId} hidden={!open} className="space-y-0.5">
              {section.items.map(item => {
                const active = isNavigationItemActive(pathname, item.path);
                const unread = getCount(item.notifKey);
                const hasDraft = item.path === draftPath;
                const accessibleName = `${item.name}${unread > 0 ? `, ${unread} à consulter` : ''}${hasDraft ? ', brouillon sauvegardé' : ''}`;
                const link = (
                  <Link
                    to={item.path}
                    aria-label={accessibleName}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    className={cn('relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring', collapsed && 'justify-center px-2', active ? 'bg-sidebar-primary/15 font-semibold text-sidebar-primary' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground')}
                  >
                    <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="min-w-0 flex-1 leading-5">{item.name}</span>}
                    {unread > 0 && <NotificationBadge count={unread} className={collapsed ? 'absolute -right-1 -top-1' : 'shrink-0'} />}
                    {hasDraft && <FileEdit aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0 text-orange-500', collapsed && 'absolute -right-1 -bottom-1')} />}
                  </Link>
                );
                return <li key={item.path}>{collapsed ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{accessibleName}</TooltipContent></Tooltip> : link}</li>;
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
