/**
 * Modèle des tableaux de bord admin / agent : fonctions pures, sans requête.
 * Tout est calculé à partir des données déjà chargées par la page.
 */

export const DAY_MS = 86400000;

/** Statuts de visite qui comptent dans « Ma journée » (les visites refusées / annulées sont exclues). */
export const VISITE_DU_JOUR_STATUTS = ['planifiee', 'confirmee', 'proposee', 'deleguee', 'effectuee'];
/** Statuts d'une visite encore à venir. */
export const VISITE_A_VENIR_STATUTS = ['planifiee', 'confirmee', 'proposee', 'deleguee'];

export type Tone = 'danger' | 'warning' | 'primary' | 'neutral';

export const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Vrai si la date tombe dans les `days` derniers jours (aujourd'hui compris). */
export function inLastDays(v: unknown, days: number, now = new Date()): boolean {
  const d = toDate(v);
  return !!d && d.getTime() <= now.getTime() && d.getTime() >= now.getTime() - days * DAY_MS;
}

/** Vrai si la date tombe entre maintenant et dans `days` jours. */
export function inNextDays(v: unknown, days: number, now = new Date()): boolean {
  const d = toDate(v);
  return !!d && d.getTime() >= now.getTime() && d.getTime() <= now.getTime() + days * DAY_MS;
}

export const s = (n: number, plural = 's') => (n > 1 ? plural : '');

export function formatHeure(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '—';
}

export function formatJourLong(d = new Date()): string {
  const t = d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Visites du jour, triées par heure. */
export function visitesDuJour<T extends { statut?: string | null; date_visite?: string | null }>(visites: T[], now = new Date()): T[] {
  return visites
    .filter((v) => {
      const d = toDate(v.date_visite);
      return !!d && isSameDay(d, now) && VISITE_DU_JOUR_STATUTS.includes(v.statut ?? '');
    })
    .sort((a, b) => (toDate(a.date_visite)?.getTime() ?? 0) - (toDate(b.date_visite)?.getTime() ?? 0));
}

/** Prochaine visite du jour encore à venir (tolérance : visite commencée il y a moins de 30 min). */
export function prochaineVisite<T extends { statut?: string | null; date_visite?: string | null }>(duJour: T[], now = new Date()): T | null {
  return duJour.find((v) => {
    const d = toDate(v.date_visite);
    return !!d && v.statut !== 'effectuee' && d.getTime() >= now.getTime() - 30 * 60000;
  }) ?? null;
}

/** Variation en % entre deux valeurs (null si la valeur de comparaison est nulle). */
export function variation(cur: number, prev: number | null | undefined): { pct: number; up: boolean } | null {
  if (prev === null || prev === undefined || prev === 0) return null;
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

export type ActionItem = {
  key: string;
  label: string;
  /** undefined = compteur indisponible sans nouvelle requête : affiché sans chiffre. */
  count?: number;
  phrase: string;
  tone: Tone;
  onClick: () => void;
  /** Explication complète (infobulle). */
  detail?: string;
};

const TONE_RANK: Record<Tone, number> = { danger: 0, warning: 1, primary: 2, neutral: 3 };

/**
 * Tri « urgent d'abord » : éléments avec compteur > 0 (par gravité, puis ordre d'origine),
 * puis éléments sans compteur, puis compteurs à zéro (grisés, jamais cachés).
 */
export function trierActions(items: ActionItem[]): ActionItem[] {
  const rank = (i: ActionItem) => (i.count === undefined ? 1 : i.count > 0 ? 0 : 2);
  return items
    .map((it, idx) => ({ it, idx }))
    .sort((a, b) => rank(a.it) - rank(b.it)
      || (rank(a.it) === 0 ? TONE_RANK[a.it.tone] - TONE_RANK[b.it.tone] : 0)
      || a.idx - b.idx)
    .map((x) => x.it);
}

/** Nombre total de points en attente (compteurs connus > 0). */
export function totalEnAttente(items: ActionItem[]): number {
  return items.reduce((n, i) => n + (i.count && i.count > 0 ? i.count : 0), 0);
}

/**
 * Regroupe les visites du jour d'un même bien au même créneau (une offre = une visite,
 * avec tous ses clients). Clé : offre_id (sinon adresse normalisée) + heure.
 * Conserve l'ordre chronologique.
 */
export function grouperVisitesParBien<T extends { date_visite?: string | null; offre_id?: string | null; adresse?: string | null; offres?: { adresse?: string | null } | null }>(
  duJour: T[],
): T[][] {
  const groupes = new Map<string, T[]>();
  for (const v of duJour) {
    const d = toDate(v.date_visite);
    const creneau = d ? `${d.getHours()}:${d.getMinutes()}` : '';
    const bien = v.offre_id || (v.adresse || v.offres?.adresse || '').trim().toLowerCase().replace(/\s+/g, ' ') || `visite-${(v as any).id}`;
    const k = `${bien}|${creneau}`;
    groupes.set(k, [...(groupes.get(k) ?? []), v]);
  }
  return Array.from(groupes.values());
}

/** « Marie Dupont » / « Marie Dupont, Paul Martin » / « 4 clients : Marie Dupont, Paul Martin… ». */
export function libelleClients(noms: (string | null | undefined)[]): string | null {
  const uniques = Array.from(new Set(noms.map((n) => (n || '').trim()).filter(Boolean)));
  if (uniques.length === 0) return null;
  if (uniques.length <= 2) return uniques.join(', ');
  return `${uniques.length} clients : ${uniques.slice(0, 2).join(', ')}…`;
}
