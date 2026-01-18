/**
 * Swiss Real Estate Capital Gains Tax Calculator
 * Impôt sur les gains immobiliers par canton (Suisse, 2026)
 * 
 * Two commission models:
 * - net_vendeur: Seller receives full "prix_vendeur", buyer pays "prix_commercial", 
 *   commission = prix_commercial - prix_vendeur (0% for seller)
 * - commission_classique: Seller pays 3% commission on sale price
 */

export type CommissionMode = 'net_vendeur' | 'commission_classique';

export type TaxSystem = 'moniste' | 'dualiste';

export interface CantonTaxConfig {
  code: string;
  name: string;
  nameFr: string;
  system: TaxSystem;
  hasCommunalSurtax: boolean;
  exemptionThreshold: number; // CHF - gains below this are exempt
  
  // Tax calculation method
  calculationType: 'degressive' | 'progressive' | 'mixed' | 'fixed' | 'income_based';
  
  // For degressive cantons - rate decreases with years owned
  degressiveRates?: { yearsOwned: number; rate: number }[];
  
  // For progressive cantons - rate increases with gain amount
  progressiveRates?: { upTo: number; rate: number }[];
  
  // For mixed cantons - both apply
  baseRate?: number;
  
  // For fixed rate cantons
  fixedRate?: number;
  
  // Duration reduction (applied after base calculation)
  durationReduction?: {
    startYear: number;
    reductionPerYear: number;
    maxReduction: number;
  };
  
  notes?: string;
}

// Complete Swiss cantonal tax configurations for 2026
export const CANTON_TAX_CONFIGS: Record<string, CantonTaxConfig> = {
  'Genève': {
    code: 'GE',
    name: 'Geneva',
    nameFr: 'Genève',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.50 },
      { yearsOwned: 2, rate: 0.40 },
      { yearsOwned: 4, rate: 0.30 },
      { yearsOwned: 6, rate: 0.20 },
      { yearsOwned: 8, rate: 0.15 },
      { yearsOwned: 10, rate: 0.10 },
      { yearsOwned: 25, rate: 0.02 }
    ],
    notes: 'Depuis 2025: taux plancher de 2% après 25 ans (auparavant exonération totale)'
  },
  'Vaud': {
    code: 'VD',
    name: 'Vaud',
    nameFr: 'Vaud',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.30 },
      { yearsOwned: 1, rate: 0.30 },
      { yearsOwned: 2, rate: 0.27 },
      { yearsOwned: 3, rate: 0.24 },
      { yearsOwned: 4, rate: 0.22 },
      { yearsOwned: 5, rate: 0.20 },
      { yearsOwned: 6, rate: 0.18 },
      { yearsOwned: 7, rate: 0.16 },
      { yearsOwned: 8, rate: 0.15 },
      { yearsOwned: 9, rate: 0.15 },
      { yearsOwned: 10, rate: 0.15 },
      { yearsOwned: 11, rate: 0.14 },
      { yearsOwned: 12, rate: 0.13 },
      { yearsOwned: 13, rate: 0.12 },
      { yearsOwned: 14, rate: 0.11 },
      { yearsOwned: 15, rate: 0.10 },
      { yearsOwned: 16, rate: 0.095 },
      { yearsOwned: 17, rate: 0.09 },
      { yearsOwned: 18, rate: 0.085 },
      { yearsOwned: 19, rate: 0.08 },
      { yearsOwned: 20, rate: 0.075 },
      { yearsOwned: 24, rate: 0.07 }
    ],
    notes: 'Taux strictement dégressif selon durée de possession'
  },
  'Valais': {
    code: 'VS',
    name: 'Valais',
    nameFr: 'Valais',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'mixed',
    progressiveRates: [
      { upTo: 50000, rate: 0.12 },
      { upTo: 100000, rate: 0.16 },
      { upTo: 200000, rate: 0.20 },
      { upTo: Infinity, rate: 0.24 }
    ],
    durationReduction: {
      startYear: 6,
      reductionPerYear: 0.04,
      maxReduction: 1.0 // Can reduce to 0% after ~25 years
    },
    notes: 'Barème progressif 12-24% + réduction de 4%/an dès la 6ème année'
  },
  'Fribourg': {
    code: 'FR',
    name: 'Fribourg',
    nameFr: 'Fribourg',
    system: 'dualiste',
    hasCommunalSurtax: true,
    exemptionThreshold: 6000,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.352 },
      { yearsOwned: 2, rate: 0.352 },
      { yearsOwned: 3, rate: 0.32 },
      { yearsOwned: 5, rate: 0.28 },
      { yearsOwned: 7, rate: 0.24 },
      { yearsOwned: 10, rate: 0.20 },
      { yearsOwned: 15, rate: 0.16 }
    ],
    notes: 'Exonération pour gains < 6000 CHF'
  },
  'Neuchâtel': {
    code: 'NE',
    name: 'Neuchâtel',
    nameFr: 'Neuchâtel',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 5000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 5000, rate: 0.10 },
      { upTo: 15000, rate: 0.15 },
      { upTo: 50000, rate: 0.20 },
      { upTo: 135000, rate: 0.25 },
      { upTo: Infinity, rate: 0.30 }
    ],
    notes: 'Barème progressif par tranches 10-30%'
  },
  'Jura': {
    code: 'JU',
    name: 'Jura',
    nameFr: 'Jura',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 4000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 50000, rate: 0.035 },
      { upTo: 100000, rate: 0.04 },
      { upTo: 150000, rate: 0.05 },
      { upTo: 200000, rate: 0.055 },
      { upTo: Infinity, rate: 0.06 }
    ],
    durationReduction: {
      startYear: 10,
      reductionPerYear: 0.05,
      maxReduction: 0.50
    },
    notes: 'Canton le plus avantageux: taux de 3.5% à 6% seulement'
  },
  'Berne': {
    code: 'BE',
    name: 'Bern',
    nameFr: 'Berne',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 0,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 5000, rate: 0.10 },
      { upTo: 10000, rate: 0.08 },
      { upTo: 50000, rate: 0.06 },
      { upTo: 100000, rate: 0.05 },
      { upTo: Infinity, rate: 0.081 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.02,
      maxReduction: 0.70
    },
    notes: 'Réduction de 2%/an dès 5 ans, max 70%'
  },
  'Zurich': {
    code: 'ZH',
    name: 'Zurich',
    nameFr: 'Zurich',
    system: 'moniste',
    hasCommunalSurtax: true, // Only communes collect this tax
    exemptionThreshold: 5000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 10000, rate: 0.10 },
      { upTo: 20000, rate: 0.15 },
      { upTo: 50000, rate: 0.20 },
      { upTo: 100000, rate: 0.25 },
      { upTo: 200000, rate: 0.30 },
      { upTo: 500000, rate: 0.35 },
      { upTo: Infinity, rate: 0.40 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.03,
      maxReduction: 0.50
    },
    notes: 'Impôt communal uniquement (pas de part cantonale directe)'
  },
  'Argovie': {
    code: 'AG',
    name: 'Aargau',
    nameFr: 'Argovie',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.40 },
      { yearsOwned: 1, rate: 0.40 },
      { yearsOwned: 5, rate: 0.30 },
      { yearsOwned: 10, rate: 0.20 },
      { yearsOwned: 15, rate: 0.15 },
      { yearsOwned: 20, rate: 0.10 },
      { yearsOwned: 25, rate: 0.05 }
    ],
    notes: 'Taux dégressif de 40% (1ère année) à 5% (25+ ans)'
  },
  'Bâle-Ville': {
    code: 'BS',
    name: 'Basel-Stadt',
    nameFr: 'Bâle-Ville',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.60 },
      { yearsOwned: 3, rate: 0.42 }, // -0.5%/month = -6%/year
      { yearsOwned: 6, rate: 0.36 },
      { yearsOwned: 9, rate: 0.30 }
    ],
    notes: 'Jusqu\'à 60% en cas de revente rapide, 30% après 9 ans'
  },
  'Bâle-Campagne': {
    code: 'BL',
    name: 'Basel-Landschaft',
    nameFr: 'Bâle-Campagne',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 0,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 10000, rate: 0.03 },
      { upTo: 50000, rate: 0.10 },
      { upTo: 100000, rate: 0.15 },
      { upTo: 200000, rate: 0.20 },
      { upTo: Infinity, rate: 0.25 }
    ],
    durationReduction: {
      startYear: 20,
      reductionPerYear: 0.10,
      maxReduction: 0.50
    },
    notes: 'Réduction forfaitaire de 5000-50000 CHF selon durée après 20 ans'
  },
  'Lucerne': {
    code: 'LU',
    name: 'Lucerne',
    nameFr: 'Lucerne',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 13000,
    calculationType: 'income_based',
    progressiveRates: [
      { upTo: 20000, rate: 0.05 },
      { upTo: 50000, rate: 0.08 },
      { upTo: 100000, rate: 0.12 },
      { upTo: Infinity, rate: 0.15 }
    ],
    notes: 'Basé sur le barème de l\'impôt sur le revenu, abattement de 13000 CHF'
  },
  'Soleure': {
    code: 'SO',
    name: 'Solothurn',
    nameFr: 'Soleure',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 10000,
    calculationType: 'income_based',
    progressiveRates: [
      { upTo: 30000, rate: 0.06 },
      { upTo: 80000, rate: 0.10 },
      { upTo: 150000, rate: 0.14 },
      { upTo: Infinity, rate: 0.18 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.02,
      maxReduction: 0.50
    },
    notes: 'Exonération jusqu\'à 10000 CHF'
  },
  'Tessin': {
    code: 'TI',
    name: 'Ticino',
    nameFr: 'Tessin',
    system: 'moniste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.31 },
      { yearsOwned: 1, rate: 0.30 },
      { yearsOwned: 5, rate: 0.26 },
      { yearsOwned: 10, rate: 0.21 },
      { yearsOwned: 15, rate: 0.16 },
      { yearsOwned: 20, rate: 0.11 },
      { yearsOwned: 25, rate: 0.06 },
      { yearsOwned: 30, rate: 0.04 }
    ],
    notes: 'Taux dégressif de 31% à 4% (diminution ~1%/an)'
  },
  'Appenzell Rhodes-Extérieures': {
    code: 'AR',
    name: 'Appenzell Ausserrhoden',
    nameFr: 'Appenzell Rhodes-Extérieures',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 3000,
    calculationType: 'fixed',
    fixedRate: 0.30,
    durationReduction: {
      startYear: 10,
      reductionPerYear: 0.025,
      maxReduction: 0.50
    },
    notes: 'Taux fixe 30%, réduit de 2.5%/an dès 10 ans (max 50% de réduction)'
  },
  'Appenzell Rhodes-Intérieures': {
    code: 'AI',
    name: 'Appenzell Innerrhoden',
    nameFr: 'Appenzell Rhodes-Intérieures',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 4000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 20000, rate: 0.10 },
      { upTo: 50000, rate: 0.20 },
      { upTo: 100000, rate: 0.30 },
      { upTo: Infinity, rate: 0.40 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.05,
      maxReduction: 0.50
    },
    notes: 'Barème progressif 10-40%'
  },
  'Glaris': {
    code: 'GL',
    name: 'Glarus',
    nameFr: 'Glaris',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 5000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 30000, rate: 0.10 },
      { upTo: 100000, rate: 0.20 },
      { upTo: Infinity, rate: 0.30 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.02,
      maxReduction: 0.40
    },
    notes: 'Barème 10-30% avec réduction pour longue détention'
  },
  'Grisons': {
    code: 'GR',
    name: 'Graubünden',
    nameFr: 'Grisons',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 4200,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 20000, rate: 0.05 },
      { upTo: 50000, rate: 0.10 },
      { upTo: 100000, rate: 0.15 },
      { upTo: 190000, rate: 0.20 },
      { upTo: Infinity, rate: 0.25 }
    ],
    durationReduction: {
      startYear: 5,
      reductionPerYear: 0.02,
      maxReduction: 0.50
    },
    notes: 'Impôt perçu conjointement par canton et communes'
  },
  'Nidwald': {
    code: 'NW',
    name: 'Nidwalden',
    nameFr: 'Nidwald',
    system: 'moniste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'degressive',
    degressiveRates: [
      { yearsOwned: 0, rate: 0.36 },
      { yearsOwned: 1, rate: 0.36 },
      { yearsOwned: 5, rate: 0.32 },
      { yearsOwned: 10, rate: 0.28 },
      { yearsOwned: 15, rate: 0.24 },
      { yearsOwned: 20, rate: 0.20 },
      { yearsOwned: 25, rate: 0.16 },
      { yearsOwned: 30, rate: 0.12 }
    ],
    notes: 'Taux dégressif de 36% à 12%'
  },
  'Obwald': {
    code: 'OW',
    name: 'Obwalden',
    nameFr: 'Obwald',
    system: 'dualiste',
    hasCommunalSurtax: true,
    exemptionThreshold: 5000,
    calculationType: 'fixed',
    fixedRate: 0.018,
    notes: 'Canton le plus avantageux: taux fixe de 1.8% seulement! (canton + commune = ~3.6%)'
  },
  'Schaffhouse': {
    code: 'SH',
    name: 'Schaffhausen',
    nameFr: 'Schaffhouse',
    system: 'moniste',
    hasCommunalSurtax: true,
    exemptionThreshold: 5000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 20000, rate: 0.02 },
      { upTo: 50000, rate: 0.05 },
      { upTo: 100000, rate: 0.10 },
      { upTo: Infinity, rate: 0.15 }
    ],
    durationReduction: {
      startYear: 6,
      reductionPerYear: 0.02,
      maxReduction: 0.40
    },
    notes: 'Barème 2-15%'
  },
  'Schwyz': {
    code: 'SZ',
    name: 'Schwyz',
    nameFr: 'Schwyz',
    system: 'moniste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'mixed',
    progressiveRates: [
      { upTo: 50000, rate: 0.08 },
      { upTo: 100000, rate: 0.15 },
      { upTo: 200000, rate: 0.22 },
      { upTo: Infinity, rate: 0.30 }
    ],
    durationReduction: {
      startYear: 3,
      reductionPerYear: 0.02,
      maxReduction: 0.50
    },
    notes: 'Barème 8-30% avec majorations pour courte détention'
  },
  'St-Gall': {
    code: 'SG',
    name: 'St. Gallen',
    nameFr: 'St-Gall',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 2200,
    calculationType: 'income_based',
    progressiveRates: [
      { upTo: 30000, rate: 0.10 },
      { upTo: 80000, rate: 0.15 },
      { upTo: 150000, rate: 0.22 },
      { upTo: Infinity, rate: 0.30 }
    ],
    notes: 'Basé sur barème IR avec facteur multiplicateur'
  },
  'Thurgovie': {
    code: 'TG',
    name: 'Thurgau',
    nameFr: 'Thurgovie',
    system: 'dualiste',
    hasCommunalSurtax: false,
    exemptionThreshold: 0,
    calculationType: 'fixed',
    fixedRate: 0.40,
    durationReduction: {
      startYear: 1,
      reductionPerYear: 0.02,
      maxReduction: 0.75
    },
    notes: 'Taux de base 40%, réduit selon durée de possession'
  },
  'Uri': {
    code: 'UR',
    name: 'Uri',
    nameFr: 'Uri',
    system: 'moniste',
    hasCommunalSurtax: false,
    exemptionThreshold: 7000,
    calculationType: 'progressive',
    progressiveRates: [
      { upTo: 20000, rate: 0.04 },
      { upTo: 50000, rate: 0.10 },
      { upTo: 100000, rate: 0.20 },
      { upTo: 200000, rate: 0.28 },
      { upTo: Infinity, rate: 0.35 }
    ],
    notes: 'Barème 4-35%, exonération jusqu\'à 7000 CHF'
  },
  'Zoug': {
    code: 'ZG',
    name: 'Zug',
    nameFr: 'Zoug',
    system: 'dualiste',
    hasCommunalSurtax: true, // Only communes collect
    exemptionThreshold: 5000,
    calculationType: 'mixed',
    progressiveRates: [
      { upTo: 50000, rate: 0.10 },
      { upTo: 100000, rate: 0.25 },
      { upTo: 200000, rate: 0.40 },
      { upTo: Infinity, rate: 0.60 }
    ],
    durationReduction: {
      startYear: 2,
      reductionPerYear: 0.03,
      maxReduction: 0.80
    },
    notes: 'Impôt communal uniquement, taux basé sur le rendement de l\'opération'
  }
};

// Add "Autres" as a fallback with median rates
CANTON_TAX_CONFIGS['Autres'] = {
  code: 'XX',
  name: 'Other',
  nameFr: 'Autres',
  system: 'dualiste',
  hasCommunalSurtax: false,
  exemptionThreshold: 5000,
  calculationType: 'progressive',
  progressiveRates: [
    { upTo: 50000, rate: 0.12 },
    { upTo: 100000, rate: 0.18 },
    { upTo: 200000, rate: 0.22 },
    { upTo: Infinity, rate: 0.25 }
  ],
  durationReduction: {
    startYear: 5,
    reductionPerYear: 0.02,
    maxReduction: 0.50
  },
  notes: 'Estimation basée sur la moyenne suisse'
};

export interface TaxCalculationInput {
  canton: string;
  gainBrut: number; // Gross capital gain
  yearsOwned: number; // Years of possession
  travauxPlusValue?: number; // Value-add works (deductible)
  fraisVente?: number; // Selling costs (notary, etc.)
}

export interface TaxCalculationResult {
  cantonConfig: CantonTaxConfig;
  gainBrut: number;
  deductions: number;
  gainImposable: number;
  tauxBase: number;
  reductionDuree: number;
  tauxEffectif: number;
  impotEstime: number;
  isExempt: boolean;
  exemptionReason?: string;
  calculationDetails: string[];
}

/**
 * Calculate years owned from acquisition date
 */
export function calculateYearsOwned(dateAcquisition: Date | string | null): number {
  if (!dateAcquisition) return 0;
  
  const acqDate = typeof dateAcquisition === 'string' ? new Date(dateAcquisition) : dateAcquisition;
  const now = new Date();
  
  const diffMs = now.getTime() - acqDate.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  
  return Math.floor(diffYears);
}

/**
 * Get the tax rate for a degressive canton based on years owned
 */
function getDegressiveRate(rates: { yearsOwned: number; rate: number }[], yearsOwned: number): number {
  // Sort rates by yearsOwned ascending
  const sortedRates = [...rates].sort((a, b) => a.yearsOwned - b.yearsOwned);
  
  // Find the applicable rate (last one where yearsOwned >= threshold)
  let applicableRate = sortedRates[0].rate;
  for (const r of sortedRates) {
    if (yearsOwned >= r.yearsOwned) {
      applicableRate = r.rate;
    } else {
      break;
    }
  }
  
  return applicableRate;
}

/**
 * Get the tax rate for a progressive canton based on gain amount
 */
function getProgressiveRate(rates: { upTo: number; rate: number }[], gain: number): number {
  // Sort rates by upTo ascending
  const sortedRates = [...rates].sort((a, b) => a.upTo - b.upTo);
  
  // Calculate weighted average rate for progressive taxation
  let totalTax = 0;
  let remainingGain = gain;
  let previousThreshold = 0;
  
  for (const r of sortedRates) {
    const bracketSize = Math.min(remainingGain, r.upTo - previousThreshold);
    if (bracketSize <= 0) break;
    
    totalTax += bracketSize * r.rate;
    remainingGain -= bracketSize;
    previousThreshold = r.upTo;
    
    if (remainingGain <= 0) break;
  }
  
  return gain > 0 ? totalTax / gain : 0;
}

/**
 * Calculate duration-based reduction
 */
function calculateDurationReduction(
  config: CantonTaxConfig,
  yearsOwned: number
): number {
  if (!config.durationReduction) return 0;
  
  const { startYear, reductionPerYear, maxReduction } = config.durationReduction;
  
  if (yearsOwned < startYear) return 0;
  
  const yearsForReduction = yearsOwned - startYear + 1;
  const totalReduction = yearsForReduction * reductionPerYear;
  
  return Math.min(totalReduction, maxReduction);
}

/**
 * Main tax calculation function
 */
export function calculateCapitalGainsTax(input: TaxCalculationInput): TaxCalculationResult {
  const config = CANTON_TAX_CONFIGS[input.canton] || CANTON_TAX_CONFIGS['Autres'];
  const details: string[] = [];
  
  // Calculate deductions
  const deductions = (input.travauxPlusValue || 0) + (input.fraisVente || 0);
  const gainImposable = Math.max(0, input.gainBrut - deductions);
  
  details.push(`Plus-value brute: CHF ${input.gainBrut.toLocaleString('fr-CH')}`);
  if (deductions > 0) {
    details.push(`Déductions: CHF ${deductions.toLocaleString('fr-CH')}`);
    details.push(`Gain imposable: CHF ${gainImposable.toLocaleString('fr-CH')}`);
  }
  
  // Check exemption threshold
  if (gainImposable <= config.exemptionThreshold) {
    return {
      cantonConfig: config,
      gainBrut: input.gainBrut,
      deductions,
      gainImposable,
      tauxBase: 0,
      reductionDuree: 0,
      tauxEffectif: 0,
      impotEstime: 0,
      isExempt: true,
      exemptionReason: `Gain inférieur au seuil d'exonération de CHF ${config.exemptionThreshold.toLocaleString('fr-CH')}`,
      calculationDetails: details
    };
  }
  
  // Calculate base rate based on calculation type
  let tauxBase: number;
  
  switch (config.calculationType) {
    case 'degressive':
      tauxBase = getDegressiveRate(config.degressiveRates || [], input.yearsOwned);
      details.push(`Taux dégressif pour ${input.yearsOwned} ans de possession: ${(tauxBase * 100).toFixed(1)}%`);
      break;
      
    case 'progressive':
      tauxBase = getProgressiveRate(config.progressiveRates || [], gainImposable);
      details.push(`Taux progressif pour un gain de CHF ${gainImposable.toLocaleString('fr-CH')}: ${(tauxBase * 100).toFixed(1)}%`);
      break;
      
    case 'mixed':
      // For mixed, use progressive rate as base
      tauxBase = getProgressiveRate(config.progressiveRates || [], gainImposable);
      details.push(`Taux de base (barème mixte): ${(tauxBase * 100).toFixed(1)}%`);
      break;
      
    case 'fixed':
      tauxBase = config.fixedRate || 0.15;
      details.push(`Taux fixe: ${(tauxBase * 100).toFixed(1)}%`);
      break;
      
    case 'income_based':
      tauxBase = getProgressiveRate(config.progressiveRates || [], gainImposable);
      details.push(`Taux basé sur barème IR: ${(tauxBase * 100).toFixed(1)}%`);
      break;
      
    default:
      tauxBase = 0.20; // Default 20%
  }
  
  // Calculate duration reduction (applies to most types except pure degressive which already factors it in)
  let reductionDuree = 0;
  if (config.calculationType !== 'degressive') {
    reductionDuree = calculateDurationReduction(config, input.yearsOwned);
    if (reductionDuree > 0) {
      details.push(`Réduction pour durée de possession (${input.yearsOwned} ans): -${(reductionDuree * 100).toFixed(0)}%`);
    }
  }
  
  // Calculate effective rate
  const tauxEffectif = tauxBase * (1 - reductionDuree);
  details.push(`Taux effectif: ${(tauxEffectif * 100).toFixed(2)}%`);
  
  // Calculate tax
  const impotEstime = Math.round(gainImposable * tauxEffectif);
  details.push(`Impôt estimé: CHF ${impotEstime.toLocaleString('fr-CH')}`);
  
  // Note about communal surtax
  if (config.hasCommunalSurtax) {
    details.push(`Note: Ce canton prévoit une surtaxe communale (montant variable selon commune)`);
  }
  
  return {
    cantonConfig: config,
    gainBrut: input.gainBrut,
    deductions,
    gainImposable,
    tauxBase,
    reductionDuree,
    tauxEffectif,
    impotEstime,
    isExempt: false,
    calculationDetails: details
  };
}

/**
 * Calculate seller's commission based on commission mode
 */
export function calculateSellerCommission(
  commissionMode: CommissionMode,
  prixVendeur: number | null,
  prixCommercial: number | null,
  prixVente: number | null
): { commission: number; sellerReceives: number; mode: CommissionMode } {
  if (commissionMode === 'net_vendeur') {
    // Seller receives full prix_vendeur, commission is the margin
    const seller = prixVendeur || 0;
    const commercial = prixCommercial || prixVendeur || 0;
    return {
      commission: commercial - seller,
      sellerReceives: seller,
      mode: 'net_vendeur'
    };
  } else {
    // Classic 3% commission
    const salePrice = prixVente || prixCommercial || prixVendeur || 0;
    const commission = Math.round(salePrice * 0.03);
    return {
      commission,
      sellerReceives: salePrice - commission,
      mode: 'commission_classique'
    };
  }
}

/**
 * Format canton name for display
 */
export function getCantonDisplayName(canton: string | null): string {
  if (!canton) return 'Non défini';
  const config = CANTON_TAX_CONFIGS[canton];
  return config ? `${config.nameFr} (${config.code})` : canton;
}

/**
 * Get list of all cantons for select dropdown
 */
export function getAllCantons(): { value: string; label: string; code: string }[] {
  return Object.entries(CANTON_TAX_CONFIGS)
    .filter(([key]) => key !== 'Autres')
    .map(([key, config]) => ({
      value: key,
      label: `${config.nameFr} (${config.code})`,
      code: config.code
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
