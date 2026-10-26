import type React from 'react';
import { cn } from '@/lib/utils';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { chfSuisse } from '@/components/stats/statsFormat';

/**
 * Gabarit commun des fenêtres de DÉTAIL (offres, leads, demandes, missions, rendez-vous…).
 *
 * Structure attendue, identique partout :
 *   <DialogContent className={DETAIL_DIALOG}>            (ou <SheetContent className={DETAIL_SHEET}>)
 *     <DetailHeader title=… subtitle=… badge=… media=… />
 *     <DetailBody>
 *       <KeyFacts items=[…] />
 *       <DetailSection title="…"><DetailRow label=… value=… /></DetailSection>
 *     </DetailBody>
 *     <DetailActions>{secondaires (outline)} {principale (default)}</DetailActions>
 *   </DialogContent>
 *
 * Mobile d'abord : bottom-sheet scrollable (90 vh), barre d'actions collée en bas avec safe-area,
 * capsules pleine largeur, zones tactiles ≥ 44 px, texte ≥ 14 px.
 * PC : fenêtre centrée max-w-2xl, actions alignées à droite.
 */

/** Classes à passer à <DialogContent> d'un dialogue de détail. */
// `!pb-0` : la barre d'actions gère elle-même la safe-area (évite le double espace du `pb-safe` mobile).
export const DETAIL_DIALOG =
  'flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 !pb-0 pt-3 sm:max-h-[88vh] sm:max-w-2xl sm:pt-0';

/** Variante plus large (galerie + beaucoup d'informations). */
export const DETAIL_DIALOG_WIDE =
  'flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 !pb-0 pt-3 sm:max-h-[90vh] sm:max-w-3xl sm:pt-0';

/** Classes à passer à <SheetContent> (tiroir latéral) d'un détail. */
export const DETAIL_SHEET = 'flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl';

/** Classes à passer à <DrawerContent> (vaul) d'un détail. */
export const DETAIL_DRAWER = 'flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0';

/* ───────────────────────── Formats (fr-CH, Europe/Zurich) ───────────────────────── */

const TZ = 'Europe/Zurich';
const DATE_SEULE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Montant suisse : « CHF 12'400 » ou « CHF 12'400.50 ». `null` si vide / invalide. */
export function chfDetail(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return chfSuisse(n, Number.isInteger(n) ? 0 : 2);
}

/** Date seule (« 26.10.2026 » ou options). Une date « AAAA-MM-JJ » ne glisse jamais d'un jour. */
export function dateCH(
  v: string | number | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  const d = toDate(v);
  if (!d) return typeof v === 'string' ? v : '';
  const timeZone = typeof v === 'string' && DATE_SEULE.test(v) ? 'UTC' : TZ;
  return d.toLocaleDateString('fr-CH', { ...opts, timeZone });
}

/** Date + heure en heure suisse ; une date seule (« AAAA-MM-JJ ») s'affiche sans 00:00. */
export function dateTimeCH(
  v: string | number | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
): string {
  if (typeof v === 'string' && DATE_SEULE.test(v)) return dateCH(v, opts);
  const d = toDate(v);
  if (!d) return typeof v === 'string' ? v : '';
  const jour = d.toLocaleDateString('fr-CH', { ...opts, timeZone: TZ });
  const heure = d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  return `${jour} à ${heure}`;
}

/* ───────────────────────── En-tête ───────────────────────── */

export function DetailHeader({
  title,
  subtitle,
  eyebrow,
  badge,
  media,
  aside,
  titleAs: TitleTag = 'h2',
  descriptionAs: DescTag = 'p',
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Petite ligne au-dessus du titre (type de bien, référence…). */
  eyebrow?: React.ReactNode;
  /** Pastille(s) de statut (DashBadge). */
  badge?: React.ReactNode;
  /** Photo / galerie affichée au-dessus du titre (arrondie 16 px). */
  media?: React.ReactNode;
  /** Élément à droite du titre (avatar, bouton icône). */
  aside?: React.ReactNode;
  /** Passer DialogTitle / SheetTitle / DrawerTitle pour l'accessibilité. */
  titleAs?: React.ElementType;
  /** Passer DialogDescription / SheetDescription pour l'accessibilité. */
  descriptionAs?: React.ElementType;
  className?: string;
}) {
  return (
    <header className={cn('shrink-0 px-4 pb-3 pt-1 sm:px-6 sm:pt-6', className)}>
      {media && <div className="mb-4 overflow-hidden rounded-2xl">{media}</div>}
      <div className="flex items-start gap-3 pr-10">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="mb-1 text-[13px] font-medium text-muted-foreground">{eyebrow}</div>}
          <TitleTag className="text-[19px] font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
            {title}
          </TitleTag>
          {subtitle && (
            <DescTag className="mt-1 text-sm leading-snug text-muted-foreground">{subtitle}</DescTag>
          )}
          {badge && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{badge}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}

/* ───────────────────────── Corps défilant ───────────────────────── */

export function DetailBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-6 pt-1 sm:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── Chiffres clés ───────────────────────── */

export interface KeyFact {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  /** Met en avant la valeur (prix, loyer) en vert. */
  emphasis?: boolean;
  /** Occupe toute la largeur de la grille. */
  wide?: boolean;
  hint?: React.ReactNode;
}

/** Tuiles verre : 2 colonnes mobile, 3 (ou 4) colonnes PC. Les valeurs vides sont masquées. */
export function KeyFacts({
  items,
  columns = 3,
  className,
}: {
  items: (KeyFact | null | false | undefined)[];
  columns?: 3 | 4;
  className?: string;
}) {
  const facts = items.filter(
    (f): f is KeyFact => !!f && f.value !== null && f.value !== undefined && f.value !== '' && f.value !== false,
  );
  if (facts.length === 0) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', columns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3', className)}>
      {facts.map((f, i) => {
        const Icon = f.icon;
        return (
          <div
            key={`${f.label}-${i}`}
            className={cn(
              'imr-lg-card flex min-h-[72px] min-w-0 flex-col justify-between rounded-2xl px-3.5 py-3',
              f.wide && 'col-span-2 sm:col-span-full',
            )}
          >
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{f.label}</span>
            </span>
            <span
              className={cn(
                'mt-1 block break-words text-[17px] font-semibold leading-tight',
                f.emphasis ? 'text-primary' : 'text-foreground',
              )}
            >
              {f.value}
            </span>
            {f.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{f.hint}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Sections ───────────────────────── */

export function DetailSection({
  title,
  icon: Icon,
  action,
  children,
  className,
  bare = false,
}: {
  title?: React.ReactNode;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Sans carte (contenu qui a déjà sa propre surface : aperçu de lien, galerie…). */
  bare?: boolean;
}) {
  return (
    <section className={cn(bare ? '' : `${DASH_CARD} p-4 sm:p-5`, className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-3">
          {title && (
            <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="truncate">{title}</span>
            </h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Ligne libellé / valeur. Masquée si la valeur est vide. */
export function DetailRow({
  label,
  value,
  icon: Icon,
  href,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ElementType;
  href?: string;
  className?: string;
}) {
  if (value === null || value === undefined || value === '' || value === false) return null;
  const content = href ? (
    <a href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {value}
    </a>
  ) : (
    value
  );
  return (
    <div className={cn('flex min-h-[44px] items-start gap-3 py-2.5 [&+&]:border-t [&+&]:border-border/50', className)}>
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-words text-[15px] font-medium text-foreground">{content}</div>
      </div>
    </div>
  );
}

/** Liste de lignes séparées par un filet fin (sans carte supplémentaire). */
export function DetailRows({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-border/50 [&>*]:border-0', className)}>{children}</div>;
}

/** Texte long (description, commentaires) lisible. */
export function DetailText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90', className)}>
      {children}
    </p>
  );
}

/** Carte contact (concierge, locataire, gérance…) : nom + liens d'appel / mail. */
export function DetailContact({
  role,
  name,
  phone,
  email,
  icon: Icon,
  extra,
}: {
  role: React.ReactNode;
  name?: React.ReactNode;
  phone?: string | null;
  email?: string | null;
  icon?: React.ElementType;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 [&+&]:border-t [&+&]:border-border/50">
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted-foreground">{role}</div>
        {name && <div className="mt-0.5 break-words text-[15px] font-medium text-foreground">{name}</div>}
        {(phone || email) && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex min-h-[32px] items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex min-h-[32px] items-center break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                {email}
              </a>
            )}
          </div>
        )}
        {extra}
      </div>
    </div>
  );
}

/* ───────────────────────── Barre d'actions ───────────────────────── */

/**
 * Barre d'actions collée en bas (safe-area). Mettre les secondaires d'abord, la principale en dernier :
 * sur mobile elles s'empilent principale en haut, pleine largeur ; sur PC alignées à droite.
 */
export function DetailActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 shrink-0 border-t border-border/50 bg-background/90 px-4 pt-3 backdrop-blur-xl sm:px-6',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4',
        'flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end',
        '[&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Message d'information discret dans le corps (bandeau verre). */
export function DetailNotice({
  icon: Icon,
  children,
  tone = 'muted',
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  tone?: 'muted' | 'primary' | 'warning' | 'danger';
}) {
  const cls = {
    muted: 'bg-muted/60 text-muted-foreground',
    primary: 'bg-primary/10 text-foreground',
    warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];
  return (
    <div className={cn('flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-sm', cls)}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Lien externe en carte (annonce d'origine, document…). */
export function DetailLinkCard({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${DASH_CARD} flex min-h-[60px] items-center justify-between gap-3 p-4 transition-transform duration-150 active:scale-[0.99]`}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>}
      </span>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </a>
  );
}
