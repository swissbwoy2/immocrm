export const BUYER_TYPE_VALUES = new Set(['acheter', 'achat', 'purchase', 'purchase_search']);

export function normalizeJourneyValue(value?: string | null) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function isBuyerType(value?: string | null) {
  return BUYER_TYPE_VALUES.has(normalizeJourneyValue(value));
}

export function isPurchaseBuyer(
  client?: { type_recherche?: string | null; journey_type?: string | null; id?: string | null; user_id?: string | null } | null,
  purchaseProject?: { id?: string | null; client_id?: string | null; user_id?: string | null } | null,
) {
  if (isBuyerType(client?.type_recherche)) return true;
  if (normalizeJourneyValue(client?.journey_type) === 'purchase_search') return true;
  if (!purchaseProject) return false;
  if (purchaseProject.id) return true;
  if (client?.id && purchaseProject.client_id === client.id) return true;
  if (client?.user_id && purchaseProject.user_id === client.user_id) return true;
  return false;
}

export function normalizeTypeRecherche(value?: string | null): 'Acheter' | 'Louer' {
  return isBuyerType(value) ? 'Acheter' : 'Louer';
}
/**
 * Parcours d'un compte client — RÈGLE UNIQUE utilisée par le dashboard, le menu latéral,
 * la barre du bas (mobile) et l'admin. Ordre de priorité :
 *   1. acheteur (type achat, journey achat ou projet d'achat existant)
 *   2. reloueur pur (journey 'property_reletting')
 *   3. parcours spécifiques du profil (rénovation, vente, relocation)
 *   4. mixte (chercheur + reloueur)
 *   5. location (chercheur de logement — modèle de base)
 */
export type ClientParcours = 'location' | 'achat' | 'relouer' | 'mixte' | 'renovation' | 'vente' | 'relocation';

export function resolveClientParcours(
  client?: { type_recherche?: string | null; journey_type?: string | null; id?: string | null; user_id?: string | null } | null,
  purchaseProject?: { id?: string | null; client_id?: string | null; user_id?: string | null } | null,
  profileParcours?: string | null,
): ClientParcours {
  if (isPurchaseBuyer(client, purchaseProject)) return 'achat';
  const journey = normalizeJourneyValue(client?.journey_type);
  if (journey === 'property_reletting') return 'relouer';
  const pt = normalizeJourneyValue(profileParcours);
  if (pt === 'renovation' || pt === 'vente' || pt === 'relocation') return pt;
  if (journey === 'mixed') return 'mixte';
  return 'location';
}
