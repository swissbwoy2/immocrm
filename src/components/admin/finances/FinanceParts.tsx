import type React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { TON_TEXTE, type ProchaineAction, type Ton } from './financeModel';

const TON_PASTILLE: Record<Ton, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

/** Tuile de synthèse (montant + libellé + précision). Cliquable si onClick est fourni. */
export function FinanceStat({ icon: Icon, label, value, hint, tone = 'primary', onClick, active }: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: Ton;
  onClick?: () => void;
  active?: boolean;
}) {
  const contenu = (
    <>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TON_PASTILLE[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
        <span className={cn('block truncate text-lg font-semibold tabular-nums md:text-xl', tone === 'warning' || tone === 'danger' ? TON_TEXTE[tone] : 'text-foreground')}>{value}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
    </>
  );
  const cls = cn(DASH_CARD, 'flex min-h-[88px] items-center gap-3 p-3 text-left sm:p-4', active && 'ring-2 ring-foreground/80');
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition-transform duration-150 active:scale-[0.98]')}>{contenu}</button>
  ) : (
    <div className={cls}>{contenu}</div>
  );
}

/** Phrase « prochaine action » colorée selon l'urgence. */
export function NextAction({ action, className }: { action: ProchaineAction; className?: string }) {
  const alerte = action.tone === 'warning' || action.tone === 'danger';
  return (
    <p className={cn('flex items-start gap-1.5 text-sm font-semibold', TON_TEXTE[action.tone], className)}>
      {alerte ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span className="min-w-0">{action.texte}</span>
    </p>
  );
}

/** Pastille de délai (ambre au-delà du seuil). */
export function DelaiPill({ label, alerte, title }: { label: string; alerte?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        alerte ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
      )}
    >
      <Clock className="h-3 w-3" /> {label}
    </span>
  );
}

/** Champ de recherche pleine largeur avec bouton effacer. */
export function SearchField({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 rounded-full pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Bouton « détails » repliable. */
export function ToggleDetails({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
    >
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      {children}
    </button>
  );
}

/** Ligne libellé / valeur dans un bloc de détails. */
export function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums text-foreground">{children}</span>
    </div>
  );
}

/** Conteneur de tableau dense (PC) dans une carte. */
export function TableCard({ children }: { children: React.ReactNode }) {
  return <div className={cn(DASH_CARD, 'overflow-hidden')}><div className="overflow-x-auto">{children}</div></div>;
}
