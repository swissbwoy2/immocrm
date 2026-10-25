import React from 'react';
import { MessageSquare, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Briques sobres de la colonne « conversations » (toutes les messageries) :
 * en-tête, recherche pleine largeur avec effacer, filtres en pastilles, liste, états vides.
 * Purement visuelles : aucune donnée chargée ici.
 */

/** En-tête de la liste : titre (+ sous-titre), élément à gauche (menu), actions à droite. */
export function ConversationListHeader({
  title,
  subtitle,
  leading,
  actions,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2 px-4 pt-4 pb-2', className)}>
      {leading && <div className="shrink-0 -ml-1">{leading}</div>}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

/** Recherche pleine largeur, arrondie, avec bouton effacer. */
export function ConversationSearchField({
  value,
  onChange,
  placeholder = 'Rechercher une conversation',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('px-4 pb-2', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-full border border-transparent bg-muted/70 pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-border focus:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Filtres en pastilles compactes, défilables horizontalement (même rendu que DashFilterPills). */
export function ConversationFilterPills<K extends string>({
  options,
  value,
  onChange,
  label = 'Filtrer les conversations',
  className,
}: {
  options: { key: K; label: string; count?: number; alert?: boolean }[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex gap-2 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.key === value;
        const count = o.count ?? 0;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:border-foreground/60',
            )}
          >
            <span className="whitespace-nowrap">{o.label}</span>
            {typeof o.count === 'number' && count > 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                  o.alert ? 'bg-primary text-primary-foreground' : active ? 'text-background/70' : 'text-muted-foreground',
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Conteneur des éléments de conversation (marges pour les éléments arrondis). */
export function ConversationItemsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 flex-col gap-0.5 px-2 py-1', className)}>{children}</div>;
}

/** État vide sobre de la liste. */
export function ConversationListEmpty({
  icon: Icon = MessageSquare,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="status">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** État vide sobre de la zone de conversation (aucune conversation ouverte). */
export function ChatEmptyState({
  icon: Icon = MessageSquare,
  title = 'Aucune conversation sélectionnée',
  description = 'Choisissez une conversation dans la liste pour afficher les messages.',
}: {
  icon?: React.ElementType;
  title?: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-8 text-center" role="status" aria-live="polite">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
