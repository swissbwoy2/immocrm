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
