import { useState, type ElementType, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { trierActions, type ActionItem, type Tone } from './staffDashboardModel';

/** Ossature de page (même gabarit que DashPage, sans second conteneur de défilement : PullToRefresh défile déjà). */
export function StaffShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-clip px-4 py-5 md:space-y-8 md:px-8 md:py-8">{children}</div>;
}

/** Titre de section sobre (h2) + action à droite. */
export function StaffSectionTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function isDesktopNow(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  } catch {
    return true;
  }
}

/**
 * Section repliable : ouverte par défaut sur PC, repliée sur mobile (si `mobileOpen` n'est pas vrai).
 * Le contenu reste MONTÉ quand la section est repliée (simplement masqué) : les composants enfants
 * gardent exactement leurs chargements d'origine.
 */
export function FoldSection({ id, title, subtitle, action, mobileOpen = false, children }: {
  id: string; title: string; subtitle?: ReactNode; action?: ReactNode; mobileOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => mobileOpen || isDesktopNow());
  const bodyId = `fold-${id}`;
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-0.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0">
            <span className="block text-xl font-semibold tracking-tight text-foreground">{title}</span>
            {subtitle && <span className="mt-0.5 block text-sm text-muted-foreground">{subtitle}</span>}
          </span>
          <ChevronDown className={`ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {action}
      </div>
      <div id={bodyId} className={open ? 'space-y-3' : 'hidden'}>{children}</div>
    </section>
  );
}

const TONE_DOT: Record<Tone, string> = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-500/10 text-amber-600',
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-foreground',
};
const TONE_TEXT: Record<Tone, string> = {
  danger: 'text-destructive',
  warning: 'text-amber-700 dark:text-amber-400',
  primary: 'text-primary',
  neutral: 'text-muted-foreground',
};

export type ActionTileItem = ActionItem & { icon: ElementType };

/** Tuile « À traiter » : un chiffre, un libellé, une phrase qui dit quoi faire. 0 = grisée. */
export function ActionTile({ item }: { item: ActionTileItem }) {
  const Icon = item.icon;
  const zero = item.count === 0;
  const tone: Tone = zero ? 'neutral' : item.tone;
  return (
    <button
      type="button"
      onClick={item.onClick}
      title={item.detail}
      className={`imr-lg-card rounded-[22px] flex min-h-[84px] w-full flex-col justify-between gap-1.5 p-3 text-left transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 ${zero ? 'opacity-60' : ''}`}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_DOT[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        {item.count !== undefined && (
          <span className={`text-[22px] font-semibold leading-none tabular-nums ${zero ? 'text-muted-foreground' : 'text-foreground'}`}>{item.count}</span>
        )}
      </span>
      <span className="block w-full min-w-0">
        <span className="block truncate text-[13px] font-semibold text-foreground sm:text-sm">{item.label}</span>
        <span className={`line-clamp-2 text-xs ${zero ? 'text-muted-foreground' : TONE_TEXT[tone]}`}>{item.phrase}</span>
      </span>
    </button>
  );
}

/** Grille des raccourcis « À traiter », triée urgent d'abord. */
export function ActionGrid({ items }: { items: ActionTileItem[] }) {
  const sorted = trierActions(items) as ActionTileItem[];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
      {sorted.map((it) => <ActionTile key={it.key} item={it} />)}
    </div>
  );
}

/** Tuile KPI sobre : libellé, valeur, phrase de sens, variation éventuelle. */
export function KpiTile({ icon: Icon, label, value, phrase, delta, deltaLabel = 'vs mois passé', onClick, className = '' }: {
  icon?: ElementType; label: string; value: ReactNode; phrase?: ReactNode;
  delta?: { pct: number; up: boolean } | null; deltaLabel?: string; onClick?: () => void; className?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 block truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">{value}</span>
      {delta && (
        <span className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium ${delta.up ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {delta.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {delta.up ? '▲' : '▼'} {delta.pct} % <span className="font-normal text-muted-foreground">{deltaLabel}</span>
        </span>
      )}
      {phrase && <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{phrase}</span>}
    </>
  );
  const cls = `imr-lg-card rounded-[22px] flex min-h-[96px] flex-col p-3 text-left sm:p-4 ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export type DayVisit = { id: string; heure: string; titre: string; sous?: string; badge?: ReactNode; onClick: () => void; /** Libellé au-dessus de l'heure (défaut « Proch. »). */ label?: string };

/** Bandeau « Ma journée » : date, nombre de visites, prochaine visite, autres visites du jour. */
export type DayUnit = { one: string; many: string; none: string; pastHint?: string };
const VISIT_UNIT: DayUnit = { one: 'visite', many: 'visites', none: 'aucune visite', pastHint: 'Les visites du jour sont passées : pensez au retour client.' };

export function DayBanner({ greeting, dateLabel, total, next, others, onAgenda, agendaLabel = 'Agenda', aside, unit = VISIT_UNIT, className = '' }: {
  greeting: string; dateLabel: string; total: number; next: DayVisit | null; others: DayVisit[];
  onAgenda: () => void; agendaLabel?: string; aside?: ReactNode; unit?: DayUnit; className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  return (
    <section className={`imr-lg-hero w-full min-w-0 max-w-full rounded-[28px] p-4 md:p-5 ${className}`} aria-label="Ma journée">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">Ma journée · {dateLabel}</p>
          <p className="mt-0.5 break-words text-base font-semibold text-foreground">
            {(() => {
              const txt = total === 0 ? `${unit.none} aujourd’hui` : `${total} ${total > 1 ? unit.many : unit.one} aujourd’hui`;
              return greeting ? `${greeting} — ${txt}` : txt.charAt(0).toUpperCase() + txt.slice(1);
            })()}
          </p>
        </div>
        <button
          type="button" onClick={onAgenda}
          className="imr-lg-glass inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">{agendaLabel}</span>
        </button>
      </div>

      {next ? (
        <button
          type="button" onClick={next.onClick}
          className="imr-lg-glass mt-3 flex w-full min-w-0 items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="imr-lg-tint flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-xl">
            <span className="text-[10px] font-medium uppercase leading-none opacity-80">{next.label ?? 'Proch.'}</span>
            <span className="text-sm font-semibold leading-tight tabular-nums">{next.heure}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{next.titre}</span>
            {next.sous && <span className="block truncate text-xs text-muted-foreground">{next.sous}</span>}
          </span>
          {next.badge}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ) : total > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4 shrink-0" /> {unit.pastHint ?? `Les ${unit.many} du jour sont passé(e)s.`}</p>
      ) : null}

      {others.length > 0 && (
        <div className="mt-2">
          <div className={showAll ? 'max-h-64 divide-y divide-border/60 overflow-y-auto overscroll-contain' : 'hidden'}>
            {others.map((v) => (
              <button key={v.id} type="button" onClick={v.onClick} className="flex w-full min-w-0 items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-black/[0.03]">
                <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-foreground">{v.heure}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{v.titre}</span>
                  {v.sous && <span className="block truncate text-xs text-muted-foreground">{v.sous}</span>}
                </span>
                {v.badge}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={() => setShowAll((x) => !x)} aria-expanded={showAll}
            className="mt-1 inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {showAll ? 'Masquer' : `Voir ${others.length > 1 ? `les ${others.length} autres` : 'l’autre'} ${others.length > 1 ? unit.many : unit.one} du jour`}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
      {aside}
    </section>
  );
}
