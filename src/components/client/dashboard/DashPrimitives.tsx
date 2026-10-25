import type React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Briques visuelles des tableaux de bord client (style Airbnb : blanc, une ombre, coins arrondis).
 * Partagées entre le parcours location (modèle de base) et le parcours achat,
 * pour une expérience identique.
 */
export const DASH_CARD =
  'rounded-2xl border border-border/70 bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)]';

export function DashSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashSectionLink({ label = 'Ouvrir', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      {label} <ChevronRight className="h-4 w-4" />
    </button>
  );
}

export function StatTile({ icon: Icon, label, value, count, onClick }: {
  icon: React.ElementType; label: string; value: string; count: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DASH_CARD} relative flex min-h-[104px] flex-col items-start justify-between p-3 text-left transition-transform duration-150 active:scale-[0.98] sm:p-4`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {count > 0 && (
        <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
      <span className="mt-2 block w-full">
        <span className="block truncate text-[13px] font-semibold text-foreground sm:text-sm">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{value}</span>
      </span>
    </button>
  );
}

export function LinkRow({ icon: Icon, label, sub, onClick }: {
  icon: React.ElementType; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DASH_CARD} flex min-h-[64px] items-center gap-3 p-3 text-left transition-transform duration-150 active:scale-[0.98]`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * Ossature d'une page de l'espace client / candidat (même rendu que « Biens proposés » et « Offres reçues ») :
 * fond uni, largeur 6xl, marges 16px mobile / 32px desktop, défilement interne.
 */
export function DashPage({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative flex-1 overflow-auto">
      <div className={`mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8 ${className}`}>{children}</div>
    </div>
  );
}

/** Titre de page : grand titre sobre + sous-titre, action éventuelle à droite. */
export function DashPageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

/** Filtres en pastilles (onglets) : la pastille active est pleine, les autres soulignées d'un trait. */
export function DashFilterPills<K extends string>({ options, value, onChange, label = 'Filtrer' }: {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
}) {
  return (
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={label}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
              active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground/60'
            }`}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className={`text-xs ${active ? 'text-background/70' : 'text-muted-foreground'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** État vide : pastille d'icône, titre, explication, action éventuelle. */
export function DashEmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-6 py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Pastille de statut (sur photo ou dans une carte). */
export function DashBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const cls = {
    neutral: 'bg-background text-foreground border border-border/70',
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  }[tone];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${cls}`}>{children}</span>;
}

/** Carte « à faire » : une action qui bloque ou attend le client. */
export function TodoCard({ icon: Icon, tone = 'amber', title, description, action }: {
  icon: React.ElementType;
  tone?: 'amber' | 'primary' | 'muted';
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const toneCls = tone === 'amber'
    ? 'bg-amber-500/10 text-amber-600'
    : tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground';
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
