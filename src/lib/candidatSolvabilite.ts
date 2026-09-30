/** Règle de solvabilité candidat (miroir de public.is_candidat_solvable en base). */
export type CandidatSolvInput = {
  revenus_mensuels?: number | string | null;
  budget_max?: number | string | null;
  type_permis?: string | null;
  poursuites?: boolean | null;
};

const PERMIS_OK = ['b', 'c', 'suisse', 'citoyen', 'citoyen suisse'];

export function isCandidatSolvable(c: CandidatSolvInput | null | undefined): boolean {
  if (!c) return false;
  const rev = Number(c.revenus_mensuels) || 0;
  const budget = Number(c.budget_max) || 0;
  const permis = (c.type_permis ?? '').trim().toLowerCase();
  return rev > 0 && rev >= 3 * budget && PERMIS_OK.includes(permis) && c.poursuites === false;
}

/** Solvabilité renseignée (3 champs obligatoires de l'essai). */
export function isSolvabiliteRenseignee(c: CandidatSolvInput | null | undefined): boolean {
  return !!c && !!(c.type_permis ?? '').trim() && (Number(c.revenus_mensuels) || 0) > 0 && typeof c.poursuites === 'boolean';
}
