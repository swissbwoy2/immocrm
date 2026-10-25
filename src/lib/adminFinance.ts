/**
 * Calculs financiers du tableau de bord admin (fonctions pures, aucune requête).
 *
 * Résultat réel d'une période :
 *   Recettes  = commissions facturées (hors acompte déjà encaissé) + activations encaissées + acomptes achat encaissés
 *   Dépenses  = remboursements versés + salaires (coût employeur) + commissions agents hors fiche de salaire + charges de l'agence
 *   Bénéfice  = Recettes − Dépenses
 */

export type PeriodKey = 'mois' | 'mois_precedent' | 'trimestre' | 'annee' | 'tout';

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'mois', label: 'Ce mois' },
  { key: 'mois_precedent', label: 'Mois passé' },
  { key: 'trimestre', label: '3 derniers mois' },
  { key: 'annee', label: 'Cette année' },
  { key: 'tout', label: 'Depuis le début' },
];

export interface Period { start: Date; end: Date; label: string }

/** Intervalle [start, end[ d'une période. */
export function periodRange(key: PeriodKey, now = new Date()): Period {
  const y = now.getFullYear();
  const m = now.getMonth();
  const label = PERIODS.find((p) => p.key === key)?.label ?? '';
  switch (key) {
    case 'mois': return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1), label };
    case 'mois_precedent': return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), label };
    case 'trimestre': return { start: new Date(y, m - 2, 1), end: new Date(y, m + 1, 1), label };
    case 'annee': return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label };
    default: return { start: new Date(2020, 0, 1), end: new Date(y, m + 1, 1), label };
  }
}

export function monthRange(year: number, monthIndex: number): Period {
  const start = new Date(year, monthIndex, 1);
  return {
    start,
    end: new Date(year, monthIndex + 1, 1),
    label: start.toLocaleDateString('fr-CH', { month: 'short' }).replace('.', ''),
  };
}

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

export const inPeriod = (v: unknown, p: Period) => {
  const d = toDate(v);
  return !!d && d >= p.start && d < p.end;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatCHF = (n: number) =>
  `CHF ${Math.round(n).toLocaleString('fr-CH').replace(/ | /g, "'")}`;

/* ---------- Données brutes ---------- */

export interface RegistreRow {
  date_conclusion: string | null;
  honoraire_total: number | null;
  commission_agent: number | null;
  commission_agence: number | null;
  montant_acompte: number | null;
  statut_paiement: string | null;
  type_affaire: string | null;
  agent_id: string | null;
}
export interface ActivationRow { date_paiement: string | null; montant_acompte: number | null; statut: string | null; created_at?: string | null; type_recherche?: string | null }
export interface AcompteAchatRow { date_paiement_acompte: string | null; montant_acompte: number | null }
export interface RefundRow { refund_status: string | null; refund_processed_at: string | null; refund_requested_at: string | null; montant: number }
export interface FicheRow { annee: number; mois: number; statut: string | null; mode_remuneration: string | null; cout_total_employeur: number | null; salaire_net: number | null; montant_commissions: number | null }
export interface ChargeRow { id: string; libelle: string; categorie: string; montant: number; recurrence: 'ponctuelle' | 'mensuelle' | 'annuelle'; date_debut: string; date_fin: string | null; notes?: string | null }

export interface FinanceInput {
  registre: RegistreRow[];
  activations: ActivationRow[];
  acomptesAchat: AcompteAchatRow[];
  refunds: RefundRow[];
  fiches: FicheRow[];
  charges: ChargeRow[];
}

export const ACTIVATION_PAYEE = ['paye', 'active'];

/** Montant d'une charge imputable à la période (mensuelle : par mois couvert ; annuelle : 1/12 par mois). */
export function chargeForPeriod(c: ChargeRow, p: Period): number {
  const debut = toDate(c.date_debut);
  if (!debut) return 0;
  const fin = toDate(c.date_fin);
  const montant = num(c.montant);
  if (c.recurrence === 'ponctuelle') return inPeriod(c.date_debut, p) ? montant : 0;
  const parMois = c.recurrence === 'annuelle' ? montant / 12 : montant;
  let total = 0;
  const cursor = new Date(p.start.getFullYear(), p.start.getMonth(), 1);
  const debutMois = new Date(debut.getFullYear(), debut.getMonth(), 1);
  const finMois = fin ? new Date(fin.getFullYear(), fin.getMonth(), 1) : null;
  // On ne compte jamais les mois futurs.
  const now = new Date();
  const limite = new Date(Math.min(p.end.getTime(), new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()));
  while (cursor < limite) {
    if (cursor >= debutMois && (!finMois || cursor <= finMois)) total += parMois;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
}

const ficheInPeriod = (f: FicheRow, p: Period) => inPeriod(new Date(f.annee, f.mois - 1, 1).toISOString(), p);

export interface FinanceResult {
  commissions: number;          // commissions facturées, hors acompte déjà encaissé
  commissionsBrutes: number;    // honoraires totaux
  commissionsAEncaisser: number;
  activations: number;
  activationsCount: number;
  acomptesAchat: number;
  recettes: number;
  remboursements: number;
  remboursementsCount: number;
  salaires: number;
  commissionsAgents: number;    // hors fiches de salaire (évite le double comptage)
  charges: number;
  chargesParCategorie: Record<string, number>;
  depenses: number;
  benefice: number;
  marge: number | null;         // en %
  affaires: number;
  affairesLocation: number;
  affairesAchat: number;
}

export function computeFinance(d: FinanceInput, p: Period): FinanceResult {
  const reg = d.registre.filter((r) => inPeriod(r.date_conclusion, p));
  const commissionsBrutes = reg.reduce((s, r) => s + num(r.honoraire_total), 0);
  const commissions = reg.reduce((s, r) => s + Math.max(0, num(r.honoraire_total) - num(r.montant_acompte)), 0);
  const commissionsAEncaisser = reg
    .filter((r) => (r.statut_paiement ?? '') !== 'paye')
    .reduce((s, r) => s + Math.max(0, num(r.honoraire_total) - num(r.montant_acompte)), 0);

  const acts = d.activations.filter((a) => ACTIVATION_PAYEE.includes(a.statut ?? '') && inPeriod(a.date_paiement, p));
  const activations = acts.reduce((s, a) => s + (num(a.montant_acompte) || 300), 0);

  const acomptesAchat = d.acomptesAchat
    .filter((a) => inPeriod(a.date_paiement_acompte, p))
    .reduce((s, a) => s + (num(a.montant_acompte) || 2500), 0);

  const refs = d.refunds.filter((r) => r.refund_status === 'processed' && inPeriod(r.refund_processed_at, p));
  const remboursements = refs.reduce((s, r) => s + num(r.montant), 0);

  const fiches = d.fiches.filter((f) => (f.statut ?? 'brouillon') !== 'brouillon' && ficheInPeriod(f, p));
  const salaires = fiches.reduce(
    (s, f) => s + (f.mode_remuneration === 'independant' ? num(f.salaire_net) : num(f.cout_total_employeur)),
    0,
  );
  const commissionsSurFiches = fiches.reduce((s, f) => s + num(f.montant_commissions), 0);
  const commissionsAgents = Math.max(0, reg.reduce((s, r) => s + num(r.commission_agent), 0) - commissionsSurFiches);

  const chargesParCategorie: Record<string, number> = {};
  let charges = 0;
  for (const c of d.charges) {
    const v = chargeForPeriod(c, p);
    if (v > 0) {
      charges += v;
      chargesParCategorie[c.categorie] = (chargesParCategorie[c.categorie] ?? 0) + v;
    }
  }

  const recettes = commissions + activations + acomptesAchat;
  const depenses = remboursements + salaires + commissionsAgents + charges;
  const benefice = recettes - depenses;

  const isAchat = (t: string | null) => /achat|vente/i.test(t ?? '');
  return {
    commissions, commissionsBrutes, commissionsAEncaisser,
    activations, activationsCount: acts.length, acomptesAchat,
    recettes,
    remboursements, remboursementsCount: refs.length,
    salaires, commissionsAgents, charges, chargesParCategorie,
    depenses, benefice,
    marge: recettes > 0 ? Math.round((benefice / recettes) * 100) : null,
    affaires: reg.length,
    affairesAchat: reg.filter((r) => isAchat(r.type_affaire)).length,
    affairesLocation: reg.filter((r) => !isAchat(r.type_affaire)).length,
  };
}

export const CHARGE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'loyer', label: 'Loyer et locaux' },
  { key: 'publicite', label: 'Publicité (Meta, Google…)' },
  { key: 'logiciels', label: 'Logiciels et abonnements' },
  { key: 'assurances', label: 'Assurances' },
  { key: 'vehicule', label: 'Véhicule et déplacements' },
  { key: 'telephonie', label: 'Téléphonie et internet' },
  { key: 'comptabilite', label: 'Comptabilité et juridique' },
  { key: 'frais_bancaires', label: 'Frais bancaires' },
  { key: 'impots', label: 'Impôts et taxes' },
  { key: 'materiel', label: 'Matériel' },
  { key: 'autre', label: 'Autre' },
];

export const chargeCategoryLabel = (k: string) => CHARGE_CATEGORIES.find((c) => c.key === k)?.label ?? k;
