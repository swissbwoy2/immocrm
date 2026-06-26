/**
 * Calcul de la tenue des charges bancaire suisse.
 * Tous les taux proviennent de purchase_financing_settings — JAMAIS hardcodés.
 */

export interface FinancingSettings {
  taux_interet_theorique: number; // %
  taux_entretien: number; // %
  taux_amortissement: number; // %
  taux_effort_max: number; // %
  fonds_propres_min: number; // %
  frais_notaire: number; // %
}

export const DEFAULT_FINANCING_SETTINGS: FinancingSettings = {
  taux_interet_theorique: 5,
  taux_entretien: 1,
  taux_amortissement: 1,
  taux_effort_max: 33,
  fonds_propres_min: 20,
  frais_notaire: 5,
};

export interface FinancingInput {
  // Revenus
  revenu_annuel_retenu?: number | null;
  bonus_3ans_moyenne?: number | null;
  allocations_familiales?: number | null;
  pensions_recues?: number | null;
  revenus_locatifs?: number | null;
  rentes_avs_ai_lpp?: number | null;
  autres_revenus?: number | null;
  // Fonds propres
  fonds_propres_cash?: number | null;
  fonds_propres_epargne?: number | null;
  fonds_propres_3a?: number | null;
  fonds_propres_lpp?: number | null;
  fonds_propres_libre_passage?: number | null;
  montant_epl_disponible?: number | null;
  placements?: number | null;
  donation_avance_hoirie?: number | null;
  // Engagements
  leasing_mensuel?: number | null;
  credit_prive_mensuel?: number | null;
  cartes_credit_mensuel?: number | null;
  pensions_versees?: number | null;
  autres_engagements?: number | null;
  // Cible
  prix_cible?: number | null;
}

export interface FinancingComputed {
  revenuTotal: number;
  engagementsAnnuels: number;
  revenuNet: number;
  fondsPropresCash: number; // hors LPP (cash + 3a + libre passage + placements + donation)
  fondsPropresLpp: number;
  fondsPropresTotal: number;
  prixCible: number;
  fondsPropresRequis: number; // % min sur prix cible
  fondsPropresRequisCash: number; // au moins la moitié des FP min doit être hors LPP
  manqueFondsPropres: number;
  manqueFondsCash: number;
  montantHypothecaire: number;
  chargesAnnuelles: number;
  chargesMensuelles: number;
  tauxEffort: number;
  prixMaxFinancable: number;
  capaciteAchatMax: number; // prix max basé sur revenu ET fonds propres dispo
  conforme: boolean;
  warnings: string[];
}

const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);

export function computeFinancing(input: FinancingInput, s: FinancingSettings): FinancingComputed {
  const revenuTotal =
    n(input.revenu_annuel_retenu) +
    n(input.bonus_3ans_moyenne) +
    n(input.allocations_familiales) +
    n(input.pensions_recues) +
    n(input.revenus_locatifs) +
    n(input.rentes_avs_ai_lpp) +
    n(input.autres_revenus);

  const engagementsAnnuels =
    (n(input.leasing_mensuel) + n(input.credit_prive_mensuel) + n(input.cartes_credit_mensuel)) * 12 +
    n(input.pensions_versees) +
    n(input.autres_engagements);

  const revenuNet = Math.max(0, revenuTotal - engagementsAnnuels);

  const fondsPropresCash =
    n(input.fonds_propres_cash) +
    n(input.fonds_propres_epargne) +
    n(input.fonds_propres_3a) +
    n(input.fonds_propres_libre_passage) +
    n(input.placements) +
    n(input.donation_avance_hoirie);

  const fondsPropresLpp = n(input.fonds_propres_lpp) + n(input.montant_epl_disponible);
  const fondsPropresTotal = fondsPropresCash + fondsPropresLpp;

  const prixCible = n(input.prix_cible);
  const fondsPropresRequis = (prixCible * s.fonds_propres_min) / 100;
  // Règle FINMA : au moins 10 % de fonds propres "durs" (hors LPP) — la moitié des FP min
  const fondsPropresRequisCash = fondsPropresRequis / 2;

  const manqueFondsPropres = Math.max(0, fondsPropresRequis - fondsPropresTotal);
  const manqueFondsCash = Math.max(0, fondsPropresRequisCash - fondsPropresCash);

  const montantHypothecaire = Math.max(0, prixCible - fondsPropresTotal);

  const tauxChargesTotal = (s.taux_interet_theorique + s.taux_entretien + s.taux_amortissement) / 100;
  const chargesAnnuelles = montantHypothecaire * tauxChargesTotal;
  const chargesMensuelles = chargesAnnuelles / 12;

  const tauxEffort = revenuNet > 0 ? (chargesAnnuelles / revenuNet) * 100 : 0;

  // Prix max basé sur revenu : (revenu × taux_effort_max) / taux_charges_total
  const prixMaxParRevenu =
    tauxChargesTotal > 0 ? (revenuNet * (s.taux_effort_max / 100)) / tauxChargesTotal : 0;

  // Prix max basé sur fonds propres : fonds_propres / fonds_propres_min
  const prixMaxParFonds = s.fonds_propres_min > 0 ? fondsPropresTotal / (s.fonds_propres_min / 100) : 0;

  const capaciteAchatMax = Math.min(prixMaxParRevenu, prixMaxParFonds);
  const prixMaxFinancable = prixMaxParRevenu;

  const warnings: string[] = [];
  if (prixCible > 0 && manqueFondsPropres > 0) {
    warnings.push(`Fonds propres insuffisants : ${Math.round(manqueFondsPropres).toLocaleString('fr-CH')} CHF manquants`);
  }
  if (prixCible > 0 && manqueFondsCash > 0) {
    warnings.push(`Fonds propres "durs" (hors LPP) insuffisants : ${Math.round(manqueFondsCash).toLocaleString('fr-CH')} CHF manquants`);
  }
  if (prixCible > 0 && tauxEffort > s.taux_effort_max) {
    warnings.push(`Taux d'effort ${tauxEffort.toFixed(1)} % > ${s.taux_effort_max} % autorisés`);
  }

  return {
    revenuTotal,
    engagementsAnnuels,
    revenuNet,
    fondsPropresCash,
    fondsPropresLpp,
    fondsPropresTotal,
    prixCible,
    fondsPropresRequis,
    fondsPropresRequisCash,
    manqueFondsPropres,
    manqueFondsCash,
    montantHypothecaire,
    chargesAnnuelles,
    chargesMensuelles,
    tauxEffort,
    prixMaxFinancable,
    capaciteAchatMax,
    conforme: warnings.length === 0 && prixCible > 0,
    warnings,
  };
}

export const formatCHF = (v: number) => `CHF ${Math.round(v).toLocaleString('fr-CH')}`;

// 17 étapes du parcours achat
export interface AchatStep {
  key: string;
  label: string;
  ordre: number;
  group: 'activation' | 'financement' | 'recherche' | 'visite' | 'offre' | 'notaire';
}

export const ACHAT_STEPS: AchatStep[] = [
  { key: 'acompte_paye',          label: 'Acompte payé (CHF 2\u00A0499)',           ordre: 1,  group: 'activation' },
  { key: 'mandat_signe',          label: 'Mandat d\'accompagnement signé',           ordre: 2,  group: 'activation' },
  { key: 'kickoff',               label: 'Rendez-vous de cadrage avec votre conseiller', ordre: 3, group: 'activation' },
  { key: 'documents_financement', label: 'Documents financiers transmis',            ordre: 4,  group: 'financement' },
  { key: 'analyse_capacite',      label: 'Capacité d\'achat calculée',               ordre: 5,  group: 'financement' },
  { key: 'envoi_banque',          label: 'Dossier envoyé au partenaire bancaire',    ordre: 6,  group: 'financement' },
  { key: 'validation_bancaire',   label: 'Validation bancaire reçue (24-48 h)',      ordre: 7,  group: 'financement' },
  { key: 'criteres_definis',      label: 'Critères de recherche définis',            ordre: 8,  group: 'recherche' },
  { key: 'biens_selectionnes',    label: 'Biens sélectionnés analysés',              ordre: 9,  group: 'recherche' },
  { key: 'visite_courtier',       label: 'Visite par notre courtier',                ordre: 10, group: 'visite' },
  { key: 'rapport_visite',        label: 'Rapport de visite remis',                  ordre: 11, group: 'visite' },
  { key: 'contre_visite',         label: 'Contre-visite avec vous',                  ordre: 12, group: 'visite' },
  { key: 'offre_envoyee',         label: 'Offre d\'achat envoyée',                   ordre: 13, group: 'offre' },
  { key: 'negociation',           label: 'Négociation aboutie',                      ordre: 14, group: 'offre' },
  { key: 'rdv_notaire',           label: 'Rendez-vous notaire planifié',             ordre: 15, group: 'notaire' },
  { key: 'signature_notariee',    label: 'Signature de l\'acte authentique',         ordre: 16, group: 'notaire' },
  { key: 'remise_cles',           label: 'Remise des clés',                          ordre: 17, group: 'notaire' },
];

export function computeProgression(dateDebut: string | null | undefined, dureeJours = 60) {
  if (!dateDebut) return { jourActuel: 0, dureeJours, pourcentage: 0, jourRestant: dureeJours };
  const start = new Date(dateDebut).getTime();
  const now = Date.now();
  const diffJours = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const jourActuel = Math.min(diffJours, dureeJours);
  const jourRestant = Math.max(0, dureeJours - jourActuel);
  const pourcentage = Math.round((jourActuel / dureeJours) * 100);
  return { jourActuel, dureeJours, pourcentage, jourRestant };
}
