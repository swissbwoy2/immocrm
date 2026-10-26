import type React from 'react';
import { ChevronRight } from 'lucide-react';
import { KpiTile } from '@/components/dashboard-staff/StaffDashParts';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import type { FicheTab } from './model';

export interface SummaryTile {
  key: string;
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  phrase?: React.ReactNode;
  tab: FicheTab;
}

/** Résumé : tuiles KPI en verre, chacune ouvre l'onglet concerné. */
export function ClientSummaryTiles({ tiles, onOpen }: { tiles: SummaryTile[]; onOpen: (tab: FicheTab) => void }) {
  return (
    <section aria-label="Résumé du client" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <KpiTile key={t.key} icon={t.icon} label={t.label} value={t.value} phrase={t.phrase} onClick={() => onOpen(t.tab)} className="min-w-0" />
      ))}
    </section>
  );
}

export interface TodoItem {
  key: string;
  icon: React.ElementType;
  tone: 'danger' | 'warning' | 'primary';
  title: string;
  detail?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}

const TONE: Record<TodoItem['tone'], string> = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-500/10 text-amber-600',
  primary: 'bg-primary/10 text-primary',
};

/** « À faire » : uniquement ce qui demande une action de l'admin, urgent d'abord. */
export function ClientTodoList({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return null;
  const order = { danger: 0, warning: 1, primary: 2 } as const;
  const sorted = [...items].sort((a, b) => order[a.tone] - order[b.tone]);
  return (
    <section aria-label="À faire" className={cn(DASH_CARD, 'p-2 sm:p-3')}>
      <h2 className="px-2 pb-1 pt-1 text-base font-semibold tracking-tight text-foreground">
        À faire <span className="text-sm font-normal text-muted-foreground">· {sorted.length}</span>
      </h2>
      <ul className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
        {sorted.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={it.onAction}
                disabled={it.disabled}
                className="imr-lg-plain flex min-h-[56px] w-full min-w-0 items-center gap-3 rounded-2xl px-2 py-2 text-left disabled:opacity-50"
              >
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TONE[it.tone])}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug text-foreground">{it.title}</span>
                  {it.detail && <span className="block truncate text-sm text-muted-foreground">{it.detail}</span>}
                </span>
                <span className="hidden shrink-0 text-sm font-medium text-primary min-[420px]:inline">{it.actionLabel}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export interface TabDef { key: FicheTab; label: string; icon: React.ElementType; count?: number }

/** Rail segmenté des onglets (défilant sur mobile). */
export function ClientTabsRail({ tabs, value, onChange }: { tabs: TabDef[]; value: FicheTab; onChange: (t: FicheTab) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label="Sections de la fiche client" className="imr-lg-segment inline-flex min-w-full gap-1 rounded-full p-1">
        {tabs.map((t) => {
          const active = t.key === value;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`fiche-tab-${t.key}`}
              aria-selected={active}
              aria-controls={`fiche-panel-${t.key}`}
              data-state={active ? 'active' : 'inactive'}
              onClick={() => onChange(t.key)}
              className={cn(
                'inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
              {typeof t.count === 'number' && t.count > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-xs font-semibold leading-5 text-muted-foreground">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Panneau d'onglet. `keepMounted` : reste monté (masqué) quand inactif, pour les blocs qui
 * chargent eux-mêmes leurs données (aucun appel retardé ni supprimé). Sinon, rendu seulement actif.
 */
export function TabPanel({ tab, active, keepMounted = false, children, className }: {
  tab: FicheTab; active: boolean; keepMounted?: boolean; children: React.ReactNode; className?: string;
}) {
  if (!active && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={`fiche-panel-${tab}`}
      aria-labelledby={`fiche-tab-${tab}`}
      hidden={!active}
      className={cn('min-w-0 space-y-4', className, !active && 'hidden')}
    >
      {children}
    </div>
  );
}
