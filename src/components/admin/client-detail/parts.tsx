import type React from 'react';
import { cn } from '@/lib/utils';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

/** Carte de section en verre : pastille d'icône, titre, action à droite. */
export function FicheCard({ icon: Icon, title, action, children, className, bodyClassName, id }: {
  icon?: React.ElementType;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn(DASH_CARD, 'min-w-0 p-4 sm:p-5', className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex min-w-0 items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
              {Icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 break-words">{title}</span>
            </h2>
          )}
          {action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Champ libellé / valeur ; une valeur vide affiche « Non renseigné » en gris. */
export function Field({ label, value, wide, emphasis, className }: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  emphasis?: boolean;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className={cn('min-w-0 rounded-2xl bg-muted/40 px-3.5 py-2.5 dark:bg-white/[0.04]', wide && 'col-span-full', className)}>
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 break-words text-[15px] font-medium', empty ? 'text-muted-foreground' : emphasis ? 'text-primary' : 'text-foreground')}>
        {empty ? 'Non renseigné' : value}
      </div>
    </div>
  );
}

/** Grille de champs : 1 colonne à 360 px, 2 dès 400 px, 3 sur grand écran si demandé. */
export function FieldGrid({ children, cols = 2, className }: { children: React.ReactNode; cols?: 2 | 3; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 min-[400px]:grid-cols-2', cols === 3 && 'xl:grid-cols-3', className)}>
      {children}
    </div>
  );
}

/** Bandeau d'information / d'alerte dans une carte. */
export function Notice({ icon: Icon, tone = 'muted', title, children, className }: {
  icon?: React.ElementType;
  tone?: 'muted' | 'primary' | 'success' | 'warning' | 'danger';
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const cls = {
    muted: 'bg-muted/60 text-muted-foreground',
    primary: 'bg-primary/10 text-foreground',
    success: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];
  return (
    <div className={cn('flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-sm', cls, className)}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}

/** Ligne de liste cliquable (visite, offre) : cible ≥ 44 px. */
export function ListRow({ onClick, leading, title, sub, trailing }: {
  onClick: () => void;
  leading?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="imr-lg-plain flex min-h-[56px] w-full min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-foreground">{title}</span>
        {sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
      </span>
      {trailing && <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{trailing}</span>}
    </button>
  );
}

/** Pavé date/heure d'une visite ou heure d'envoi d'une offre. */
export function TimeChip({ top, bottom }: { top: string; bottom?: string }) {
  return (
    <span className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
      <span className="text-[13px] font-semibold leading-tight tabular-nums">{top}</span>
      {bottom && <span className="text-xs leading-tight tabular-nums opacity-80">{bottom}</span>}
    </span>
  );
}

/** Rendu d'une valeur de contact : e-mails (mailto:) et téléphones (tel:) cliquables */
export const renderContactLine = (raw: string) => {
  const tokens = String(raw)
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return (
    <span className="text-[15px]">
      {tokens.map((token, i) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token);
        const isPhone = /^[+0-9][0-9\s()./\-]+$/.test(token) && token.replace(/\D/g, '').length >= 8;
        if (isEmail) {
          return (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={`mailto:${token}`} className="font-medium text-primary underline-offset-4 hover:underline break-all">{token}</a>
            </span>
          );
        }
        if (isPhone) {
          const digits = token.replace(/[^+0-9]/g, '');
          return (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={`tel:${digits}`} className="font-medium text-primary underline-offset-4 hover:underline">{token}</a>
            </span>
          );
        }
        return (
          <span key={i}>
            {i > 0 && ' · '}
            {token}
          </span>
        );
      })}
    </span>
  );
};

/** Contacts d'une offre (gérance, annonceur, visite, concierge). */
export function OffreContacts({ offre }: { offre: any }) {
  if (!offre) return null;
  const contacts: { label: string; value: string }[] = [];
  if (offre.contact_gerance) contacts.push({ label: 'Gérance', value: offre.contact_gerance });
  if (offre.contact_annonceur) contacts.push({ label: 'Annonceur', value: offre.contact_annonceur });
  if (offre.contact_visite) contacts.push({ label: 'Contact visite', value: offre.contact_visite });
  if (offre.concierge_nom || offre.concierge_tel) {
    contacts.push({ label: 'Concierge', value: [offre.concierge_nom, offre.concierge_tel].filter(Boolean).join(', ') });
  }
  if (contacts.length === 0) return null;
  return (
    <div className="divide-y divide-border/50">
      {contacts.map((c, idx) => (
        <div key={idx} className="flex min-h-[44px] flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-3">
          <span className="w-32 shrink-0 text-[13px] text-muted-foreground sm:pt-0.5">{c.label}</span>
          <span className="min-w-0 break-words">{renderContactLine(c.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** État vide léger à l'intérieur d'une carte (sans seconde carte). */
export function InlineEmpty({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
