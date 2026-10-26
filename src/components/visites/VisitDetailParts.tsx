import type React from 'react';
import { ClipboardList, FileText, Play, ImageIcon } from 'lucide-react';
import { AddressLink } from '@/components/AddressLink';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { formatZurichDay, formatZurichTimeRange, isDateOnly } from '@/lib/dateZurich';

/**
 * Briques communes du « détail de visite » (tous rôles : admin, agent, client,
 * candidat, propriétaire, coursier). Purement visuelles : aucune donnée n'est
 * chargée ici, chaque écran garde ses propres requêtes et actions.
 */

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

/** Contenu de dialogue de visite : plein écran mobile (bottom-sheet), max-w-2xl/3xl sur PC. */
export const VISIT_DIALOG_CLASS =
  'max-w-2xl lg:max-w-3xl max-h-[92dvh] overflow-y-auto overscroll-contain gap-0 p-0 pt-3 md:pt-0 sm:rounded-[26px]';

/** Corps scrollable d'un dialogue de visite. */
export function VisitBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-4 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 ${className}`}>{children}</div>;
}

const STATUT_META: Record<string, { label: string; tone: Tone }> = {
  planifiee: { label: 'Planifiée', tone: 'primary' },
  proposee: { label: 'Créneau proposé', tone: 'warning' },
  confirmee: { label: 'Confirmée', tone: 'success' },
  effectuee: { label: 'Effectuée', tone: 'success' },
  annulee: { label: 'Annulée', tone: 'danger' },
  refusee: { label: 'Refusée', tone: 'danger' },
  en_cours: { label: 'En cours', tone: 'primary' },
  acceptee: { label: 'Acceptée', tone: 'success' },
  terminee: { label: 'Terminée', tone: 'success' },
  en_attente: { label: 'En attente', tone: 'warning' },
};

export function visitStatutMeta(statut?: string | null): { label: string; tone: Tone } | null {
  if (!statut) return null;
  return STATUT_META[statut] || { label: statut.replace(/_/g, ' '), tone: 'muted' };
}

export function VisitStatusBadge({ statut }: { statut?: string | null }) {
  const meta = visitStatutMeta(statut);
  if (!meta) return null;
  return <DashBadge tone={meta.tone}>{meta.label}</DashBadge>;
}

/**
 * Date et heure de visite en fr-CH, fuseau Europe/Zurich.
 * Un jour seul (colonne DATE, "AAAA-MM-JJ") n'est pas converti en heure.
 */
export function formatVisitDate(iso?: string | null, endIso?: string | null) {
  if (!iso) return { day: '', time: '' };
  const day = formatZurichDay(iso);
  if (!day) return { day: '', time: '' };
  return { day, time: isDateOnly(iso) ? '' : formatZurichTimeRange(iso, endIso) };
}

/**
 * En-tête du détail de visite : statut, date et heure en grand, adresse avec lien carte, puis photo arrondie (si disponible).
 * `TitleAs` permet de passer `DialogTitle` / `SheetTitle` pour l'accessibilité.
 */
export function VisitHero({
  date, endDate, kicker, badges, address, photoUrl, title, TitleAs = 'h2', children,
}: {
  date?: string | null;
  endDate?: string | null;
  kicker?: string;
  badges?: React.ReactNode;
  address?: string | null;
  photoUrl?: string | null;
  title?: React.ReactNode;
  TitleAs?: React.ElementType;
  children?: React.ReactNode;
}) {
  const { day, time } = formatVisitDate(date, endDate);
  return (
    <header className="space-y-3 px-4 pb-2 pt-2 sm:px-6 sm:pt-6">
      {(kicker || badges) && (
        <div className="flex flex-wrap items-center gap-1.5 pr-12">
          {kicker && <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kicker}</span>}
          {badges}
        </div>
      )}
      <TitleAs className={`block text-left ${kicker || badges ? '' : 'pr-12'}`}>
        {day ? (
          <>
            <span className="block text-[22px] font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">{day}</span>
            {time && <span className="mt-0.5 block text-lg font-semibold text-primary">{time}</span>}
          </>
        ) : (
          <span className="block text-[22px] font-semibold leading-tight tracking-tight text-foreground">{title || 'Visite'}</span>
        )}
      </TitleAs>
      {day && title && <p className="text-[15px] font-medium text-foreground">{title}</p>}
      {address && (
        <AddressLink address={address} className="text-[15px] font-medium leading-snug text-foreground" iconClassName="h-4 w-4 text-primary" showExternalIcon />
      )}
      {photoUrl && (
        <div className="overflow-hidden rounded-[20px] bg-muted">
          <img src={photoUrl} alt="" className="h-40 w-full object-cover sm:h-52" loading="lazy" onError={(e) => { const p = e.currentTarget.parentElement; if (p) p.style.display = 'none'; }} />
        </div>
      )}
      {children}
    </header>
  );
}

export interface VisitInfoItem {
  icon?: React.ElementType;
  label: string;
  value?: React.ReactNode;
  href?: string;
}

/** Tuiles verre « infos clés » : 2 colonnes mobile, 3-4 sur PC. Les éléments sans valeur sont ignorés. */
export function VisitInfoTiles({ items, className = '' }: { items: VisitInfoItem[]; className?: string }) {
  const list = items.filter((it) => it.value !== undefined && it.value !== null && it.value !== '' && it.value !== false);
  if (list.length === 0) return null;
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {list.map((it, i) => {
        const Icon = it.icon;
        const inner = (
          <>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{it.label}</span>
            </span>
            <span className="mt-1 block break-words text-[15px] font-semibold leading-snug text-foreground">{it.value}</span>
          </>
        );
        return it.href ? (
          <a key={i} href={it.href} className="imr-lg-glass block min-h-[64px] min-w-0 rounded-2xl px-3 py-2.5">{inner}</a>
        ) : (
          <div key={i} className="imr-lg-glass min-h-[64px] min-w-0 rounded-2xl px-3 py-2.5">{inner}</div>
        );
      })}
    </div>
  );
}

/** Section en carte verre avec titre. */
export function VisitSection({ icon: Icon, title, action, children, className = '' }: {
  icon?: React.ElementType; title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`imr-lg-card min-w-0 rounded-[22px] p-4 ${className}`} aria-label={title}>
      <div className="mb-3 flex min-h-8 items-center gap-2">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="min-w-0 space-y-3 text-sm">{children}</div>
    </section>
  );
}

/** Ligne de participant (client, agent, coursier…). */
export function VisitPersonRow({ role, name, sub, action }: { role: string; name: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  const initials = typeof name === 'string'
    ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : '';
  return (
    <div className="flex min-h-[52px] items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials || '•'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{role}</p>
        <p className="truncate text-[15px] font-medium text-foreground">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Bloc de texte (notes, description…) dans une surface verre claire. */
export function VisitNote({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warning' }) {
  const cls = tone === 'warning' ? 'bg-amber-500/10 text-foreground' : 'bg-muted/60 text-foreground';
  return <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

/**
 * Barre d'actions en bas : collée en bas sur mobile (safe-area).
 * `primary` = action principale (pleine largeur sur mobile), `children` = actions secondaires en capsules.
 */
export function VisitActionBar({ primary, children }: { primary?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-xl sm:px-6 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {children && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:mr-auto sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:min-h-11 [&>*]:shrink-0">{children}</div>
        )}
        {primary && <div className="flex flex-col gap-2 sm:flex-row [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto">{primary}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Médias & compte rendu (lecture)                                   */
/* ---------------------------------------------------------------- */

function mediaKind(m: any): 'image' | 'video' | 'file' {
  const t = `${m?.type || ''} ${m?.mime || ''}`.toLowerCase();
  const n = `${m?.name || ''} ${m?.url || ''}`.toLowerCase();
  if (t.includes('video') || /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|$)/.test(n)) return 'video';
  if (t.includes('image') || /\.(jpe?g|png|gif|webp|heic|avif)(\?|$)/.test(n)) return 'image';
  return 'file';
}

/** Grille arrondie de médias (photos, vidéos, fichiers). */
export function VisitMediaGrid({ medias, renderAction }: { medias: any[]; renderAction?: (m: any, i: number) => React.ReactNode }) {
  const list = (Array.isArray(medias) ? medias : []).filter((m) => m && m.url);
  if (list.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {list.map((m, i) => {
        const kind = mediaKind(m);
        return (
          <div key={`${m.url}-${i}`} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <a href={m.url} target="_blank" rel="noreferrer" className="block h-full w-full" aria-label={m.name || 'Média'}>
              {kind === 'image' ? (
                <img src={m.url} alt={m.name || ''} className="h-full w-full object-cover" loading="lazy" />
              ) : kind === 'video' ? (
                <span className="relative block h-full w-full bg-black">
                  <video src={m.url} preload="metadata" muted playsInline className="h-full w-full object-cover opacity-90" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-foreground"><Play className="h-4 w-4" /></span>
                  </span>
                </span>
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted-foreground">
                  <FileText className="h-6 w-6" />
                  <span className="line-clamp-2 break-all">{m.name || 'Fichier'}</span>
                </span>
              )}
            </a>
            {renderAction?.(m, i)}
          </div>
        );
      })}
    </div>
  );
}

const L_APPRECIATION: Record<string, string> = { tres_positif: 'Très positif', positif: 'Positif', mitige: 'Mitigé', negatif: 'Négatif' };
const L_ETAT: Record<string, string> = { excellent: 'Excellent', bon: 'Bon', moyen: 'Moyen', a_renover: 'À rénover' };
const L_INTERET: Record<string, string> = { tres_interesse: 'Très intéressé', interesse: 'Intéressé', hesitant: 'Hésitant', non_interesse: 'Non intéressé' };
const L_CUISINE: Record<string, string> = { agencee: 'Agencée', equipee: 'Équipée', simple: 'Simple', a_renover: 'À rénover' };
const yesNo = (v: any) => (v === null || v === undefined ? undefined : v ? 'Oui' : 'Non');

/**
 * Affichage en lecture d'un compte rendu : format structuré (`visite_comptes_rendus`)
 * ou ancien format libre (`visites.compte_rendu`).
 */
export function CompteRenduView({ cr, legacy, title = 'Compte rendu de la visite', bare = false, showRegie = false }: {
  cr?: any | null; legacy?: any | null; title?: string; bare?: boolean;
  /** Affiche le contact régie de l'ancien format (masqué par défaut). */
  showRegie?: boolean;
}) {
  if (!cr && !(legacy && typeof legacy === 'object')) return null;

  let tiles: VisitInfoItem[] = [];
  const texts: { label: string; value?: string | null }[] = [];
  let chipsPlus: string[] = [];
  let chipsMinus: string[] = [];
  let medias: any[] = [];

  if (cr) {
    tiles = [
      { label: 'Appréciation', value: cr.appreciation_globale ? (L_APPRECIATION[cr.appreciation_globale] || cr.appreciation_globale) : undefined },
      { label: 'État du bien', value: cr.etat_general ? (L_ETAT[cr.etat_general] || cr.etat_general) : undefined },
      { label: 'Intérêt', value: cr.interet_client ? (L_INTERET[cr.interet_client] || cr.interet_client) : undefined },
      { label: 'Cuisine', value: cr.cuisine_type ? (L_CUISINE[cr.cuisine_type] || cr.cuisine_type) : undefined },
      { label: 'Ascenseur', value: yesNo(cr.ascenseur) },
      { label: 'Balcon / terrasse', value: yesNo(cr.balcon) },
      { label: 'Parking', value: yesNo(cr.parking) },
    ];
    texts.push({ label: 'Cuisine', value: cr.cuisine_description });
    texts.push({ label: 'Commentaire', value: cr.commentaire_libre });
    texts.push({ label: 'Prochaines étapes', value: cr.prochaines_etapes });
    chipsPlus = Array.isArray(cr.points_forts) ? cr.points_forts : [];
    chipsMinus = Array.isArray(cr.points_faibles) ? cr.points_faibles : [];
    medias = Array.isArray(cr.medias) ? cr.medias : [];
  } else if (legacy) {
    tiles = [
      { label: 'Ascenseur', value: legacy.ascenseur ? (legacy.ascenseur === 'oui' ? 'Oui' : 'Non') : undefined },
      { label: 'Sol', value: legacy.type_sol },
      { label: 'État', value: legacy.etat_general },
      { label: 'Régie', value: showRegie ? legacy.contact_regie : undefined },
    ];
    texts.push({ label: 'Avantages', value: legacy.avantages });
    texts.push({ label: 'Inconvénients', value: legacy.inconvenients });
    texts.push({ label: 'Autres informations', value: legacy.autres_infos });
  }

  const content = (
    <>
      <VisitInfoTiles items={tiles} />
      {(chipsPlus.length > 0 || chipsMinus.length > 0) && (
        <div className="space-y-2">
          {chipsPlus.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-xs font-medium text-muted-foreground">Points forts</span>
              {chipsPlus.map((c, i) => <DashBadge key={`p${i}`} tone="success">{c}</DashBadge>)}
            </div>
          )}
          {chipsMinus.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-xs font-medium text-muted-foreground">Points faibles</span>
              {chipsMinus.map((c, i) => <DashBadge key={`m${i}`} tone="warning">{c}</DashBadge>)}
            </div>
          )}
        </div>
      )}
      {texts.filter((t) => t.value && String(t.value).trim()).map((t) => (
        <div key={t.label} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
          <VisitNote>{t.value}</VisitNote>
        </div>
      ))}
      {medias.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ImageIcon className="h-3.5 w-3.5" /> Photos, vidéos et fichiers</p>
          <VisitMediaGrid medias={medias} />
        </div>
      )}
    </>
  );

  if (bare) return <div className="space-y-3">{content}</div>;
  return <VisitSection icon={ClipboardList} title={title}>{content}</VisitSection>;
}

/** Première photo connue d'une offre (galerie `medias_galerie`), sans requête. */
export function offrePhotoUrl(offre?: any | null): string | null {
  const g = offre?.medias_galerie;
  if (!Array.isArray(g)) return null;
  for (const m of g) {
    const u = typeof m === 'string' ? m : m?.url;
    const t = typeof m === 'object' && m ? `${m.type || ''} ${m.mime || ''}` : '';
    if (typeof u === 'string' && u && !/video/i.test(t) && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return u;
  }
  return null;
}

/** Montant en CHF, format suisse. */
export function formatCHF(v?: number | string | null, suffix = ''): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return `${v}${suffix}`;
  return `${new Intl.NumberFormat('fr-CH').format(n)} CHF${suffix}`;
}
