import { supabase } from '@/integrations/supabase/client';

export type CandidatCriteresLite = {
  user_id: string;
  type_recherche: string | null;
  type_bien: string | null;
  pieces_recherche: string | null;
  region_recherche: string | null;
  budget_max: number | null;
  nombre_occupants: number | null;
  date_entree_souhaitee: string | null;
  type_permis: string | null;
  revenus_mensuels: number | null;
  poursuites: boolean | null;
  garant_solvable?: boolean | null;
  garant_nom?: string | null;
  garant_lien?: string | null;
  garant_revenus?: number | null;
  garant_permis?: string | null;
  garant_poursuites?: boolean | null;
  garant_actes_defaut?: boolean | null;
};

export type CandidatGarantInfo = Pick<CandidatCriteresLite, 'garant_solvable' | 'garant_nom' | 'garant_lien' | 'garant_revenus' | 'garant_permis' | 'garant_poursuites' | 'garant_actes_defaut'>;

/** Charge en une requête les critères candidat d'une liste de user_id. */
export async function fetchCandidatCriteresMap(userIds: string[]): Promise<Map<string, CandidatCriteresLite>> {
  const map = new Map<string, CandidatCriteresLite>();
  if (userIds.length === 0) return map;
  const { data, error } = await (supabase.from as any)('candidat_criteres')
    .select('user_id, type_recherche, type_bien, pieces_recherche, region_recherche, budget_max, nombre_occupants, date_entree_souhaitee, type_permis, revenus_mensuels, poursuites, garant_solvable, garant_nom, garant_lien, garant_revenus, garant_permis, garant_poursuites, garant_actes_defaut')
    .in('user_id', userIds)
    .limit(15000);
  if (error) {
    console.error('candidat_criteres fetch failed', error);
    return map;
  }
  (data as CandidatCriteresLite[] | null)?.forEach((row) => map.set(row.user_id, row));
  return map;
}

/** '2+' -> 2, '3.5' -> 3.5, sinon null. */
function parsePieces(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value.replace('+', '').trim());
  return Number.isNaN(n) ? null : n;
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || v === 0;

/**
 * Complète un objet client avec les critères candidat quand ses propres
 * critères sont vides. Les valeurs déjà renseignées dans `clients` restent
 * prioritaires et ne sont jamais écrasées.
 */
export function mergeCandidatCriteres<T extends Record<string, any>>(client: T, cc: CandidatCriteresLite | undefined): T {
  if (!cc) return client;
  const merged: Record<string, any> = { ...client };
  if (isEmpty(merged.type_recherche) && cc.type_recherche) merged.type_recherche = cc.type_recherche;
  if (isEmpty(merged.type_bien) && cc.type_bien) merged.type_bien = cc.type_bien;
  if (isEmpty(merged.pieces)) {
    const p = parsePieces(cc.pieces_recherche);
    if (p !== null) merged.pieces = p;
  }
  if (isEmpty(merged.region_recherche) && cc.region_recherche) merged.region_recherche = cc.region_recherche;
  if (isEmpty(merged.budget_max) && cc.budget_max) merged.budget_max = cc.budget_max;
  if (isEmpty(merged.nombre_occupants) && cc.nombre_occupants) merged.nombre_occupants = cc.nombre_occupants;
  // clients.poursuites vaut false par défaut : on ne le considère « renseigné » que si la solvabilité client l'est (revenu > 0).
  const clientSolvabiliteVide = isEmpty(client.revenus_mensuels);
  if (isEmpty(merged.type_permis) && cc.type_permis) merged.type_permis = cc.type_permis;
  if (clientSolvabiliteVide && cc.revenus_mensuels) merged.revenus_mensuels = Number(cc.revenus_mensuels);
  if (clientSolvabiliteVide && typeof cc.poursuites === 'boolean') merged.poursuites = cc.poursuites;
  // Garant déclaré par le candidat : information affichée uniquement (n'entre pas dans le calcul du badge).
  if (cc.garant_solvable != null || cc.garant_nom) {
    merged.candidat_garant = {
      garant_solvable: cc.garant_solvable ?? null, garant_nom: cc.garant_nom ?? null, garant_lien: cc.garant_lien ?? null,
      garant_revenus: cc.garant_revenus ?? null, garant_permis: cc.garant_permis ?? null,
      garant_poursuites: cc.garant_poursuites ?? null, garant_actes_defaut: cc.garant_actes_defaut ?? null,
    } as CandidatGarantInfo;
  }
  return merged as T;
}
