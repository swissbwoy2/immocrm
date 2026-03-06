/**
 * Swiss Payroll Calculation Engine
 * Handles AVS/AI/APG, AC, AANP, IJM, LPP, LPCFam, source tax, employer charges
 */

// Default employee deduction rates (%)
export const DEFAULT_EMPLOYEE_RATES = {
  avs: 5.3,        // AVS/AI/APG
  ac: 1.1,         // Assurance chômage
  aanp: 1.2,       // Accident non professionnel
  ijm: 0.8,        // Indemnité journalière maladie
  lpcfam: 0.06,    // LPCFam VD
};

// Default employer charge rates (%)
export const DEFAULT_EMPLOYER_RATES = {
  avs: 5.3,
  ac: 1.1,
  aap: 0.5,        // Accident professionnel
  lpcfam: 0.06,
  af: 2.0,         // Allocations familiales VD
};

// Source tax barème codes (simplified)
export const BAREMES_IMPOT_SOURCE: Record<string, string> = {
  'A0': 'Célibataire sans enfant',
  'A1': 'Célibataire avec 1 enfant',
  'A2': 'Célibataire avec 2 enfants',
  'B0': 'Marié sans enfant (1 revenu)',
  'B1': 'Marié avec 1 enfant (1 revenu)',
  'B2': 'Marié avec 2 enfants (1 revenu)',
  'B3': 'Marié avec 3 enfants (1 revenu)',
  'C0': 'Marié sans enfant (2 revenus)',
  'C1': 'Marié avec 1 enfant (2 revenus)',
  'C2': 'Marié avec 2 enfants (2 revenus)',
  'D': 'Revenu accessoire',
  'H0': 'Famille monoparentale sans enfant',
  'H1': 'Famille monoparentale avec 1 enfant',
  'H2': 'Famille monoparentale avec 2 enfants',
};

// Types of permits subject to source tax
export const PERMIS_IMPOT_SOURCE = ['B', 'F', 'N', 'L'];

export interface SalaryCalculation {
  salaire_base: number;
  absences_payees: number;
  heures_supplementaires: number;
  primes: number;
  salaire_brut: number;
  // Employee deductions
  montant_avs: number;
  montant_ac: number;
  montant_aanp: number;
  montant_ijm: number;
  montant_lpcfam: number;
  montant_lpp: number;
  montant_impot_source: number;
  total_deductions: number;
  salaire_net: number;
  // Employer charges
  montant_avs_employeur: number;
  montant_ac_employeur: number;
  montant_aap: number;
  montant_lpcfam_employeur: number;
  montant_lpp_employeur: number;
  montant_af: number;
  total_charges_employeur: number;
  cout_total_employeur: number;
}

export interface SalaryInput {
  salaire_base: number;
  absences_payees?: number;
  heures_supplementaires?: number;
  primes?: number;
  // Rates
  taux_avs?: number;
  taux_ac?: number;
  taux_aanp?: number;
  taux_ijm?: number;
  taux_lpcfam?: number;
  montant_lpp?: number;
  taux_impot_source?: number;
  // Employer rates
  taux_avs_employeur?: number;
  taux_ac_employeur?: number;
  taux_aap?: number;
  taux_lpcfam_employeur?: number;
  montant_lpp_employeur?: number;
  taux_af?: number;
}

function round5(n: number): number {
  return Math.round(n * 20) / 20; // Round to nearest 0.05
}

export function calculateSalary(input: SalaryInput): SalaryCalculation {
  const salaire_base = input.salaire_base || 0;
  const absences_payees = input.absences_payees || 0;
  const heures_supplementaires = input.heures_supplementaires || 0;
  const primes = input.primes || 0;
  const salaire_brut = salaire_base + absences_payees + heures_supplementaires + primes;

  // Employee deductions
  const taux_avs = input.taux_avs ?? DEFAULT_EMPLOYEE_RATES.avs;
  const taux_ac = input.taux_ac ?? DEFAULT_EMPLOYEE_RATES.ac;
  const taux_aanp = input.taux_aanp ?? DEFAULT_EMPLOYEE_RATES.aanp;
  const taux_ijm = input.taux_ijm ?? DEFAULT_EMPLOYEE_RATES.ijm;
  const taux_lpcfam = input.taux_lpcfam ?? DEFAULT_EMPLOYEE_RATES.lpcfam;
  const montant_lpp = input.montant_lpp || 0;
  const taux_impot_source = input.taux_impot_source || 0;

  const montant_avs = round5(salaire_brut * taux_avs / 100);
  const montant_ac = round5(salaire_brut * taux_ac / 100);
  const montant_aanp = round5(salaire_brut * taux_aanp / 100);
  const montant_ijm = round5(salaire_brut * taux_ijm / 100);
  const montant_lpcfam = round5(salaire_brut * taux_lpcfam / 100);
  const montant_impot_source = round5(salaire_brut * taux_impot_source / 100);

  const total_deductions = round5(
    montant_avs + montant_ac + montant_aanp + montant_ijm +
    montant_lpcfam + montant_lpp + montant_impot_source
  );
  const salaire_net = round5(salaire_brut - total_deductions);

  // Employer charges
  const taux_avs_e = input.taux_avs_employeur ?? DEFAULT_EMPLOYER_RATES.avs;
  const taux_ac_e = input.taux_ac_employeur ?? DEFAULT_EMPLOYER_RATES.ac;
  const taux_aap = input.taux_aap ?? DEFAULT_EMPLOYER_RATES.aap;
  const taux_lpcfam_e = input.taux_lpcfam_employeur ?? DEFAULT_EMPLOYER_RATES.lpcfam;
  const montant_lpp_e = input.montant_lpp_employeur || montant_lpp;
  const taux_af = input.taux_af ?? DEFAULT_EMPLOYER_RATES.af;

  const montant_avs_e = round5(salaire_brut * taux_avs_e / 100);
  const montant_ac_e = round5(salaire_brut * taux_ac_e / 100);
  const montant_aap = round5(salaire_brut * taux_aap / 100);
  const montant_lpcfam_e = round5(salaire_brut * taux_lpcfam_e / 100);
  const montant_af = round5(salaire_brut * taux_af / 100);

  const total_charges_employeur = round5(
    montant_avs_e + montant_ac_e + montant_aap + montant_lpcfam_e +
    montant_lpp_e + montant_af
  );
  const cout_total_employeur = round5(salaire_brut + total_charges_employeur);

  return {
    salaire_base, absences_payees, heures_supplementaires, primes, salaire_brut,
    montant_avs, montant_ac, montant_aanp, montant_ijm, montant_lpcfam, montant_lpp,
    montant_impot_source, total_deductions, salaire_net,
    montant_avs_employeur: montant_avs_e, montant_ac_employeur: montant_ac_e,
    montant_aap, montant_lpcfam_employeur: montant_lpcfam_e,
    montant_lpp_employeur: montant_lpp_e, montant_af,
    total_charges_employeur, cout_total_employeur,
  };
}

export function isSubjectToSourceTax(typePermis: string | null | undefined): boolean {
  if (!typePermis) return false;
  return PERMIS_IMPOT_SOURCE.includes(typePermis);
}

export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(amount);
}

export const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const CANTONS = [
  'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
  'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
  'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH',
];
