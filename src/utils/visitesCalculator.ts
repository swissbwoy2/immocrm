/**
 * Utilities for counting unique visits
 * A unique visit = same date_visite + same adresse (regardless of number of clients)
 */

interface Visite {
  date_visite: string;
  adresse: string;
}

/**
 * Counts the number of unique physical visits
 * One visit = same date_visite + same adresse (regardless of number of clients)
 */
export function countUniqueVisites(visites: Visite[]): number {
  const uniqueVisites = new Set(
    visites.map(v => `${v.date_visite}-${v.adresse}`)
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
    const key = `${v.date_visite}-${v.adresse}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
