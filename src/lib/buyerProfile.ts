/**
 * Parcours ACHETEUR — source de vérité unique pour le revenu et les zones de recherche.
 *
 * Règle métier (conforme aux règles bancaires suisses) :
 *  - le revenu de référence de l'acheteur est ANNUEL (`purchase_financing_profiles.revenu_annuel_retenu`) ;
 *  - toute valeur « mensuelle » affichée pour un acheteur est DÉRIVÉE (annuel / 12) ;
 *  - `clients.revenus_mensuels` n'est plus une saisie indépendante : c'est un miroir de annuel / 12.
 */

export const monthlyToAnnual = (monthly: number | null | undefined): number =>
  Math.round((Number(monthly) || 0) * 12);

export const annualToMonthly = (annual: number | null | undefined): number =>
  Math.round((Number(annual) || 0) / 12);

/** Revenu annuel de référence de l'acheteur (repli sur l'ancien mensuel × 12 si le profil n'existe pas encore). */
export function getBuyerAnnualIncome(
  financing: { revenu_annuel_retenu?: number | null } | null | undefined,
  client?: { revenus_mensuels?: number | null } | null,
): number {
  const annual = Number(financing?.revenu_annuel_retenu) || 0;
  if (annual > 0) return annual;
  return monthlyToAnnual(client?.revenus_mensuels);
}

/** Revenu mensuel DÉRIVÉ de l'acheteur — ne jamais lire `clients.revenus_mensuels` directement pour un acheteur. */
export function getBuyerMonthlyIncome(
  financing: { revenu_annuel_retenu?: number | null } | null | undefined,
  client?: { revenus_mensuels?: number | null } | null,
): number {
  return annualToMonthly(getBuyerAnnualIncome(financing, client));
}

/**
 * Zones de recherche : stockées dans `clients.region_recherche` en liste séparée par des virgules.
 * Rétro-compatible : une valeur unique existante reste valable et renvoie un tableau d'un élément.
 */
export function parseZones(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);
}

export function formatZones(zones: string[]): string {
  return zones.map((z) => z.trim()).filter(Boolean).join(', ');
}

export function zonesLabel(value: string | null | undefined): string {
  const zones = parseZones(value);
  return zones.length > 1 ? 'Zones recherchées' : 'Zone recherchée';
}
