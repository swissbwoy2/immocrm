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
