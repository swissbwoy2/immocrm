import type React from 'react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';

/**
 * Briques des écrans de réglages admin (Paramètres, Steeve) : carte en verre avec titre,
 * description courte et pied d'actions, ligne de réglage à interrupteur aligné à droite,
 * navigation par sections (rail segmenté sur mobile, colonne latérale sur ordinateur).
 */

type Tone = 'primary' | 'amber' | 'muted' | 'danger';
const TONE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  muted: 'bg-muted text-foreground',
  danger: 'bg-destructive/10 text-destructive',
};

export function SettingsCard({
  id, icon: Icon, tone = 'primary', title, description, action, children, footer, className,
}: {
  id: string;
  icon?: React.ElementType;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn(DASH_CARD, 'min-w-0 p-4 md:p-6', className)}>
      <header className="flex items-start gap-3">
        {Icon && (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', TONE[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id={id} className="text-base font-semibold leading-snug text-foreground md:text-[17px]">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </header>
      {children !== undefined && children !== null && children !== false && <div className="mt-4 min-w-0 md:mt-5">{children}</div>}
      {footer && (
        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Ligne de réglage : libellé + explication à gauche, contrôle (interrupteur, liste) à droite. */
export function SettingRow({ htmlFor, label, description, children, stackOnMobile = false }: {
  htmlFor?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  stackOnMobile?: boolean;
}) {
  return (
    <div className={cn('flex min-h-[56px] gap-4 py-3', stackOnMobile ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'items-center justify-between')}>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[15px] font-medium leading-snug text-foreground">{label}</label>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className={cn('flex shrink-0 items-center', stackOnMobile && 'w-full sm:w-auto')}>{children}</div>
    </div>
  );
}

/** Liste de lignes séparées d'un filet (dans une carte). */
export function SettingsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('-my-3 divide-y divide-border/60', className)}>{children}</div>;
}

/** Sous-bloc discret dans une carte (liste d'éléments, statistiques) — sans effet de carte. */
export const SETTINGS_INSET = 'rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]';

/**
 * Habille en verre un composant partagé rendu avec la carte shadcn (sans le modifier) :
 * la carte enfant devient transparente, le conteneur porte la carte en verre.
 */
export function GlassSlot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(DASH_CARD, 'min-w-0 overflow-hidden [&>*]:rounded-[22px] [&>*]:border-0 [&>*]:bg-transparent [&>*]:shadow-none', className)}>
      {children}
    </div>
  );
}

export type SettingsSection<K extends string> = { key: K; label: string; sub?: string; icon: React.ElementType; count?: number };

/**
 * Navigation par sections : rail segmenté défilant sur mobile/tablette, colonne latérale sur ordinateur.
 * À placer comme premier enfant d'une grille `lg:grid-cols-[260px_minmax(0,1fr)]`.
 */
export function SettingsSectionNav<K extends string>({ sections, value, onChange, label, idPrefix }: {
  sections: SettingsSection<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  idPrefix: string;
}) {
  return (
    <div className="min-w-0">
      {/* Mobile / tablette : rail segmenté défilant */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 lg:hidden [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label={label} className="imr-lg-segment inline-flex min-w-full gap-1 rounded-full p-1">
          {sections.map((s) => {
            const active = s.key === value;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${s.key}`}
                aria-selected={active}
                aria-controls={`${idPrefix}-panel`}
                data-state={active ? 'active' : 'inactive'}
                onClick={() => onChange(s.key)}
                className={cn(
                  'inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <s.icon className="h-4 w-4" aria-hidden="true" />
                {s.label}
                {typeof s.count === 'number' && s.count > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">{s.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ordinateur : colonne latérale */}
      <nav aria-label={label} className={cn(DASH_CARD, 'sticky top-6 hidden p-2 lg:block')}>
        <ul className="space-y-1">
          {sections.map((s) => {
            const active = s.key === value;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-controls={`${idPrefix}-panel`}
                  onClick={() => onChange(s.key)}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors',
                    active ? 'imr-lg-lens text-foreground' : 'imr-lg-plain text-foreground/80',
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                    <s.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', active ? 'font-semibold' : 'font-medium')}>{s.label}</span>
                    {s.sub && <span className="block truncate text-[13px] leading-snug text-muted-foreground">{s.sub}</span>}
                  </span>
                  {typeof s.count === 'number' && s.count > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">{s.count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
