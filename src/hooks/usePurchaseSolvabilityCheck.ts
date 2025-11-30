import { useMemo } from 'react';
import { ClientCandidate } from './useClientCandidates';
import { hasStableStatus, SolvabilityProblem, ExcludedCandidate } from './useSolvabilityCheck';

export interface PurchaseSolvabilityResult {
  isSolvable: boolean;
  problems: SolvabilityProblem[];
  prixAchatMax: number;
  prixDemande: number;
  apportDisponible: number;
  apportRequis: number;
  apportManquant: number;
  chargesAnnuelles: number;
  chargesMensuelles: number;
  revenuAnnuelRequis: number;
  revenuAnnuelBrut: number;
  tauxEffort: number;
  clientHasStableStatus: boolean;
  excludedCandidates: ExcludedCandidate[];
}

interface ClientData {
  revenus_mensuels?: number;
  budget_max?: number; // For purchase, this is the purchase price
  apport_personnel?: number;
  poursuites?: boolean;
  type_permis?: string | null;
  nationalite?: string | null;
}

// Constants for Swiss mortgage rules
const TAUX_INTERET_THEORIQUE = 0.05; // 5% theoretical interest rate
const TAUX_AMORTISSEMENT = 0.01; // 1% amortization per year
const TAUX_ENTRETIEN = 0.01; // 1% maintenance per year
const TAUX_CHARGES_TOTAL = TAUX_INTERET_THEORIQUE + TAUX_AMORTISSEMENT + TAUX_ENTRETIEN; // 7%
const TAUX_EFFORT_MAX = 0.33; // 33% max of gross annual income
const APPORT_MIN_POURCENTAGE = 0.26; // 26% minimum down payment (20% + 5% notary + 1% maintenance)

export function usePurchaseSolvabilityCheck(
  client: ClientData | null,
  candidates: ClientCandidate[]
): PurchaseSolvabilityResult {
  return useMemo(() => {
    const problems: SolvabilityProblem[] = [];
    const excludedCandidates: ExcludedCandidate[] = [];

    if (!client) {
      return {
        isSolvable: true,
        problems: [],
        prixAchatMax: 0,
        prixDemande: 0,
        apportDisponible: 0,
        apportRequis: 0,
        apportManquant: 0,
        chargesAnnuelles: 0,
        chargesMensuelles: 0,
        revenuAnnuelRequis: 0,
        revenuAnnuelBrut: 0,
        tauxEffort: 0,
        clientHasStableStatus: true,
        excludedCandidates: [],
      };
    }

    const prixDemande = client.budget_max || 0;
    const apportDisponible = client.apport_personnel || 0;
    const revenuMensuel = client.revenus_mensuels || 0;
    const revenuAnnuelBrut = revenuMensuel * 12;

    // Check client's stable status (B/C permit or Swiss)
    const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);

    // Calculate required down payment (26% of purchase price)
    const apportRequis = Math.round(prixDemande * APPORT_MIN_POURCENTAGE);
    const apportManquant = Math.max(0, apportRequis - apportDisponible);

    // Calculate theoretical annual charges (7% of purchase price)
    const chargesAnnuelles = Math.round(prixDemande * TAUX_CHARGES_TOTAL);
    const chargesMensuelles = Math.round(chargesAnnuelles / 12);

    // Calculate required annual income for this purchase price
    const revenuAnnuelRequis = Math.round(chargesAnnuelles / TAUX_EFFORT_MAX);

    // Calculate effort rate (charges / income)
    const tauxEffort = revenuAnnuelBrut > 0 
      ? Math.round((chargesAnnuelles / revenuAnnuelBrut) * 100) 
      : 100;

    // Calculate maximum purchase price based on income
    // Prix max = (Revenus annuels × 0.33) / 0.07
    const prixAchatMax = revenuAnnuelBrut > 0 
      ? Math.round((revenuAnnuelBrut * TAUX_EFFORT_MAX) / TAUX_CHARGES_TOTAL)
      : 0;

    // ============ PROBLEM DETECTION ============

    // 1. Check if client has stable permit (B, C or Swiss)
    if (!clientHasStableStatus) {
      problems.push({
        type: 'critical',
        code: 'UNSTABLE_PERMIT',
        message: `Votre permis (${client.type_permis || 'non renseigné'}) ne permet pas l'accès à la propriété en Suisse`,
        solution: 'En Suisse, seuls les titulaires de permis B, C ou de nationalité suisse peuvent devenir propriétaires',
      });
    }

    // 2. Check if client has poursuites
    if (client.poursuites) {
      problems.push({
        type: 'critical',
        code: 'POURSUITES',
        message: 'Vous avez des poursuites inscrites',
        solution: 'Les banques refusent généralement les dossiers avec des poursuites. Régularisez votre situation avant de faire une demande.',
      });
    }

    // 3. Check down payment
    if (prixDemande > 0 && apportManquant > 0) {
      problems.push({
        type: 'critical',
        code: 'INSUFFICIENT_INCOME',
        message: `Apport insuffisant: ${apportDisponible.toLocaleString()} CHF disponible, ${apportRequis.toLocaleString()} CHF requis (26%)`,
        solution: `Il vous manque ${apportManquant.toLocaleString()} CHF pour atteindre les 26% requis (20% achat + 5% notaire + 1% entretien)`,
      });
    }

    // 4. Check income viability (33% rule)
    if (prixDemande > 0 && tauxEffort > 33) {
      const montantMax = prixAchatMax.toLocaleString();
      problems.push({
        type: 'warning',
        code: 'INSUFFICIENT_INCOME',
        message: `Charges hypothécaires (${tauxEffort}%) > 33% des revenus`,
        solution: `Vos revenus permettent un achat max de ${montantMax} CHF. Augmentez vos revenus ou réduisez le prix d'achat.`,
      });
    }

    // 5. Check if purchase price exceeds maximum
    if (prixDemande > 0 && prixDemande > prixAchatMax && prixAchatMax > 0) {
      problems.push({
        type: 'warning',
        code: 'INSUFFICIENT_INCOME',
        message: `Prix demandé (${prixDemande.toLocaleString()} CHF) supérieur au maximum finançable (${prixAchatMax.toLocaleString()} CHF)`,
        solution: 'Réduisez le prix d\'achat recherché ou augmentez vos revenus',
      });
    }

    // Determine solvability
    const hasCriticalProblems = problems.some(p => p.type === 'critical');
    const isSolvable = !hasCriticalProblems && 
      clientHasStableStatus && 
      apportManquant === 0 && 
      (prixDemande === 0 || tauxEffort <= 35);

    return {
      isSolvable,
      problems,
      prixAchatMax,
      prixDemande,
      apportDisponible,
      apportRequis,
      apportManquant,
      chargesAnnuelles,
      chargesMensuelles,
      revenuAnnuelRequis,
      revenuAnnuelBrut,
      tauxEffort,
      clientHasStableStatus,
      excludedCandidates,
    };
  }, [client, candidates]);
}

// Helper function to format CHF amounts
export function formatCHF(amount: number): string {
  return `CHF ${amount.toLocaleString('fr-CH')}`;
}
