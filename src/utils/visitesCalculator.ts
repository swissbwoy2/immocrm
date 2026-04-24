/**
 * Utilities for counting unique visits and offers
 * A unique visit/offer = same date + same adresse (regardless of number of clients)
 */

interface Visite {
  date_visite: string;
  adresse: string;
}

interface Offre {
  date_envoi: string;
  adresse: string;
}

/**
 * Counts the number of unique physical visits
 * One visit = same date_visite + same adresse (regardless of number of clients)
 */
export function countUniqueVisites(visites: Visite[]): number {
  const uniqueVisites = new Set(
    visites.map(v => `${v.date_visite?.split('T')[0]}-${v.adresse}`)
  );
  return uniqueVisites.size;
}

/**
 * Filters and counts unique visits within a date range
 */
export function countUniqueVisitesInRange(
  visites: Visite[],
  startDate: string,
  endDate: string
): number {
  const filtered = visites.filter(
    v => v.date_visite && v.date_visite >= startDate && v.date_visite <= endDate
  );
  return countUniqueVisites(filtered);
}

/**
 * Returns unique visits (deduplicated by date + adresse)
 */
export function getUniqueVisites<T extends Visite>(visites: T[]): T[] {
  const seen = new Set<string>();
  return visites.filter(v => {
    const key = `${v.date_visite?.split('T')[0]}-${v.adresse}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Counts the number of unique offers
 * One offer = same date_envoi (day) + same adresse (regardless of number of clients)
 */
export function countUniqueOffres(offres: Offre[]): number {
  const uniqueOffres = new Set(
    offres.map(o => `${o.date_envoi?.split('T')[0]}-${o.adresse}`)
  );
  return uniqueOffres.size;
}

/**
 * Filters and counts unique offers within a date range
 */
export function countUniqueOffresInRange(
  offres: Offre[],
  startDate: string,
  endDate: string
): number {
  const filtered = offres.filter(
    o => o.date_envoi && o.date_envoi >= startDate && o.date_envoi <= endDate
  );
  return countUniqueOffres(filtered);
}

/**
 * Returns unique offers (deduplicated by date + adresse)
 */
export function getUniqueOffres<T extends Offre>(offres: T[]): T[] {
  const seen = new Set<string>();
  return offres.filter(o => {
    const key = `${o.date_envoi?.split('T')[0]}-${o.adresse}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicates visits by client_id to show each client only once
 */
export function getUniqueVisitesByClient<T extends { client_id: string }>(visites: T[]): T[] {
  const seen = new Set<string>();
  return visites.filter(visite => {
    if (!visite.client_id || seen.has(visite.client_id)) return false;
    seen.add(visite.client_id);
    return true;
  });
}

/**
 * ============================================================
 * GROUPING HELPERS — multi-clients offers / visits
 * ============================================================
 * Same offer/visit sent to multiple clients = ONE logical event.
 * Used by UI (1 card per group) and ICS export (1 event per group).
 */

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Stable RFC 5545 UID — same physical visit always returns the same UID
 *  → iPhone/Google Calendar UPDATES instead of duplicating on re-import.
 */
export function buildStableVisiteUID(adresse: string, dateVisite: string): string {
  const dayPart = (dateVisite || '').replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15);
  return `visite-${dayPart}-${slugify(adresse)}@logisorama.ch`;
}

export function buildStableOffreUID(agentId: string | null | undefined, adresse: string, dateEnvoi: string): string {
  const dayPart = (dateEnvoi || '').slice(0, 10).replace(/-/g, '');
  return `offre-${dayPart}-${slugify(adresse)}-${(agentId || 'na').slice(0, 8)}@logisorama.ch`;
}

export function buildVisiteGroupKey(adresse: string, dateVisite: string): string {
  // Group by exact ISO timestamp + adresse (same batch = same instant)
  return `${(dateVisite || '').slice(0, 16)}__${(adresse || '').trim().toLowerCase()}`;
}

export function buildOffreGroupKey(
  agentId: string | null | undefined,
  adresse: string,
  prix: number | null | undefined,
  dateEnvoi: string
): string {
  // Same agent + same adresse + same prix + same day = same logical offer batch
  const day = (dateEnvoi || '').slice(0, 10);
  return `${agentId || 'na'}__${day}__${(adresse || '').trim().toLowerCase()}__${prix ?? ''}`;
}

export interface GroupedItem<T> {
  key: string;
  representative: T;       // first item of the group
  items: T[];              // all individual rows (per client)
  count: number;           // items.length
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): GroupedItem<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    representative: items[0],
    items,
    count: items.length,
  }));
}

export function groupOffresByEnvoi<T extends { agent_id?: string | null; adresse: string; prix?: number | null; date_envoi: string }>(
  offres: T[]
): GroupedItem<T>[] {
  return groupBy(offres, o => buildOffreGroupKey(o.agent_id, o.adresse, o.prix, o.date_envoi));
}

export function groupVisitesByPhysique<T extends { adresse: string; date_visite: string }>(
  visites: T[]
): GroupedItem<T>[] {
  return groupBy(visites, v => buildVisiteGroupKey(v.adresse, v.date_visite));
}
