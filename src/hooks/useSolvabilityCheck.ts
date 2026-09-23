import { useMemo } from 'react';
import { ClientCandidate, CUMULATIVE_TYPES } from './useClientCandidates';

export interface SolvabilityProblem {
  type: 'critical' | 'warning';
  code: 
    | 'POURSUITES' 
    | 'INSUFFICIENT_INCOME' 
    | 'GARANT_POURSUITES' 
    | 'GARANT_INSUFFICIENT'
    | 'UNSTABLE_PERMIT'
    | 'GARANT_REQUIRED'
    | 'GARANT_UNSTABLE_PERMIT'
    | 'CANDIDATE_UNSTABLE_PERMIT';
  message: string;
  solution: string;
}

export interface ExcludedCandidate {
  name: string;
  type: string;
  reason: string;
}

export interface SolvabilityResult {
  isSolvable: boolean;
  problems: SolvabilityProblem[];
  budgetPossible: number;
  budgetDemande: number;
  totalRevenus: number;
  clientRevenus: number;
  candidatesRevenus: number;
  contributeurs: number;
  hasValidGarant: boolean;
  garantInfo?: {
    nom: string;
    revenus: number;
    maxLoyer: number;
    permis?: string;
  };
  clientHasStableStatus: boolean;
  excludedCandidates: ExcludedCandidate[];
  solvabilitySource: 'client' | 'garant' | 'combined';
}

interface ClientData {
  revenus_mensuels?: number;
  budget_max?: number;
  poursuites?: boolean;
  type_permis?: string | null;
  nationalite?: string | null;
}

// Helper function to check if someone has a stable status (permit B/C or Swiss nationality)
export function hasStableStatus(permis: string | null | undefined, nationalite: string | null | undefined): boolean {
  const stablePermits = ['B', 'C', 'Suisse', 'Suisse / Autre'];
  const isSwiss = nationalite?.toLowerCase().includes('suisse') || false;
  const hasStablePermit = permis ? stablePermits.some(p => permis.includes(p)) : false;
  return isSwiss || hasStablePermit;
}

// Helper function to get permit display text
function getPermitDisplay(permis: string | null | undefined): string {
  if (!permis) return 'non renseigné';
  return permis;
}

export function useSolvabilityCheck(
  client: ClientData | null,
  candidates: ClientCandidate[]
): SolvabilityResult {
  return useMemo(() => {
    const problems: SolvabilityProblem[] = [];
    const excludedCandidates: ExcludedCandidate[] = [];
    
    if (!client) {
      return {
        isSolvable: true,
        problems: [],
        budgetPossible: 0,
        budgetDemande: 0,
        totalRevenus: 0,
        clientRevenus: 0,
        candidatesRevenus: 0,
        contributeurs: 1,
        hasValidGarant: false,
        clientHasStableStatus: true,
        excludedCandidates: [],
        solvabilitySource: 'client',
      };
    }

    const clientRevenus = client.revenus_mensuels || 0;
    const budgetDemande = client.budget_max || 0;
    
    // Check client's stable status
    const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
    
    // Filter candidates with stable status for cumulative calculation
    const stableCumulativeCandidates = candidates.filter(c => {
      if (!CUMULATIVE_TYPES.includes(c.type)) return false;
      if (c.poursuites) return false;
      
      const candidateHasStableStatus = hasStableStatus(c.type_permis, c.nationalite);
      
      if (!candidateHasStableStatus) {
        // Track excluded candidates
        excludedCandidates.push({
          name: `${c.prenom} ${c.nom}`,
          type: c.type,
          reason: `Permis ${getPermitDisplay(c.type_permis)} - statut non stable`,
        });
        return false;
      }
      
      return true;
    });
    
    // Calculate revenues only from stable candidates
    const candidatesRevenus = stableCumulativeCandidates
      .reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
    
    // If client has stable status AND no poursuites, include their revenue; otherwise only count candidates
    const clientContributesToRevenue = clientHasStableStatus && !client.poursuites;
    
    const totalRevenus = clientContributesToRevenue 
      ? clientRevenus + candidatesRevenus 
      : candidatesRevenus;
    
    const budgetPossible = Math.round(totalRevenus / 3);
    
    // Count contributors (only those with stable status AND no poursuites)
    const contributeurs = (clientContributesToRevenue ? 1 : 0) + stableCumulativeCandidates.length;
    
    // Check for valid guarantors
    const garants = candidates.filter(c => c.type === 'garant');
    
    // Garants valides : sans poursuites et statut stable. Leurs revenus sont CUMULÉS.
    const stableGarants = garants.filter(g => !g.poursuites && hasStableStatus(g.type_permis, g.nationalite));
    const garantsRevenusTotal = stableGarants.reduce((sum, g) => sum + (g.revenus_mensuels || 0), 0);
    const garantsCoverBudget = budgetDemande > 0 ? garantsRevenusTotal >= budgetDemande * 3 : stableGarants.length > 0;
    const garantCoverageValid = stableGarants.length > 0 && (budgetDemande === 0 || garantsCoverBudget);
    const garantBudgetPossible = Math.round(garantsRevenusTotal / 3);
    
    let garantInfo;
    if (garantCoverageValid) {
      garantInfo = {
        nom: stableGarants.map(g => `${g.prenom} ${g.nom}`).join(' + '),
        revenus: garantsRevenusTotal,
        maxLoyer: garantBudgetPossible,
        permis: stableGarants[0]?.type_permis,
      };
    }
    
    // ============ PROBLEM DETECTION ============
    
    // 1. Check if client has poursuites
    if (client.poursuites) {
      problems.push({
        type: 'critical',
        code: 'POURSUITES',
        message: 'Vous avez des poursuites inscrites',
        solution: 'Ajouter un GARANT obligatoire (sans poursuites, permis B/C ou suisse, revenus >= 3x le loyer)',
      });
    }
    
    // 2. Check if client has unstable permit and no valid guarantor
    if (!clientHasStableStatus && !garantCoverageValid) {
      problems.push({
        type: 'critical',
        code: 'GARANT_REQUIRED',
        message: `Votre permis (${getPermitDisplay(client.type_permis)}) nécessite un garant solvable`,
        solution: 'Ajouter un GARANT avec permis B/C ou nationalité suisse et revenus cumulés >= 3x le loyer',
      });
    }
    
    // 3. Check if revenues are sufficient for requested budget
    // For clients with unstable status, check if guarantor can cover
    if (budgetDemande > 0) {
      if (clientHasStableStatus && budgetDemande > budgetPossible && !garantCoverageValid) {
        problems.push({
          type: 'warning',
          code: 'INSUFFICIENT_INCOME',
          message: `Budget demandé (CHF ${budgetDemande.toLocaleString()}) supérieur au budget possible (CHF ${budgetPossible.toLocaleString()})`,
          solution: 'Ajouter un CO-DÉBITEUR (permis B/C ou suisse) ou un GARANT pour augmenter votre capacité',
        });
      } else if (!clientHasStableStatus && garantCoverageValid) {
        // Client unstable but garants (cumulated) can cover - check if their total can cover the budget
        if (budgetDemande > garantBudgetPossible) {
          problems.push({
            type: 'warning',
            code: 'GARANT_INSUFFICIENT',
            message: `Les garants ne peuvent garantir que CHF ${garantBudgetPossible.toLocaleString()}/mois (cumulé)`,
            solution: `Le budget demandé (CHF ${budgetDemande.toLocaleString()}) dépasse la capacité cumulée des garants`,
          });
        }
      }
    }
    
    // 4. Check guarantors with poursuites
    const garantsAvecPoursuites = garants.filter(g => g.poursuites);
    garantsAvecPoursuites.forEach(g => {
      problems.push({
        type: 'critical',
        code: 'GARANT_POURSUITES',
        message: `Le garant ${g.prenom} ${g.nom} a des poursuites`,
        solution: 'Un garant ne peut pas avoir de poursuites. Veuillez modifier ou remplacer ce garant.',
      });
    });
    
    // 5. Check guarantors with unstable permits
    const garantsUnstable = garants.filter(g => 
      !g.poursuites && !hasStableStatus(g.type_permis, g.nationalite)
    );
    garantsUnstable.forEach(g => {
      problems.push({
        type: 'critical',
        code: 'GARANT_UNSTABLE_PERMIT',
        message: `Le garant ${g.prenom} ${g.nom} a un permis non stable (${getPermitDisplay(g.type_permis)})`,
        solution: 'Un garant doit avoir un permis B, C ou être de nationalité suisse pour être valide',
      });
    });
    
    // 6. Check cumulated guarantors income (only when coverage is insufficient)
    if (!garantsCoverBudget && budgetDemande > 0 && stableGarants.length > 0) {
      problems.push({
        type: 'warning',
        code: 'GARANT_INSUFFICIENT',
        message: `Les garants totalisent CHF ${garantsRevenusTotal.toLocaleString()} — insuffisant (min CHF ${(budgetDemande * 3).toLocaleString()} = 3× le loyer)`,
        solution: `La somme des revenus des garants doit être ≥ 3× le loyer demandé (${budgetDemande} × 3 = CHF ${(budgetDemande * 3).toLocaleString()})`,
      });
    }
    
    // 7. Warn about candidates with unstable permits that are not counted
    candidates
      .filter(c => 
        CUMULATIVE_TYPES.includes(c.type) && 
        !c.poursuites &&
        !hasStableStatus(c.type_permis, c.nationalite)
      )
      .forEach(c => {
        problems.push({
          type: 'warning',
          code: 'CANDIDATE_UNSTABLE_PERMIT',
          message: `${c.prenom} ${c.nom} (${getCandidateTypeLabel(c.type)}) n'est pas comptabilisé - permis ${getPermitDisplay(c.type_permis)}`,
          solution: 'Ce candidat doit avoir un permis B, C ou être de nationalité suisse pour que ses revenus soient pris en compte',
        });
      });
    
    // ============ DETERMINE SOLVABILITY ============
    
    const hasCriticalProblems = problems.some(p => p.type === 'critical');
    
    // Determine the source of solvability
    let solvabilitySource: 'client' | 'garant' | 'combined' = 'client';
    
    if (!clientHasStableStatus && garantCoverageValid) {
      solvabilitySource = 'garant';
    } else if (clientHasStableStatus && garantCoverageValid) {
      solvabilitySource = 'combined';
    }
    
    // Calculate effective budget possible based on source
    let effectiveBudgetPossible = budgetPossible;
    if (solvabilitySource === 'garant') {
      effectiveBudgetPossible = garantBudgetPossible;
    }
    
    // Solvable if:
    // - No critical problems (or they are resolved by valid cumulated guarantors)
    // - Budget is covered (by client+candidates or by cumulated guarantors)
    const criticalProblemsResolved = !hasCriticalProblems || garantCoverageValid;
    
    const budgetCovered = budgetDemande === 0 || 
      (clientHasStableStatus && budgetPossible >= budgetDemande) ||
      garantCoverageValid;
    
    const isSolvable = criticalProblemsResolved && budgetCovered && 
      (clientHasStableStatus || garantCoverageValid);
    
    return {
      isSolvable,
      problems,
      budgetPossible: Math.max(budgetPossible, garantCoverageValid ? garantBudgetPossible : 0),
      budgetDemande,
      totalRevenus,
      clientRevenus,
      candidatesRevenus,
      contributeurs,
      hasValidGarant: garantCoverageValid,
      garantInfo,
      clientHasStableStatus,
      excludedCandidates,
      solvabilitySource,
    };
  }, [client, candidates]);
}

// Helper function to get candidate type label
function getCandidateTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    colocataire: 'Colocataire',
    co_debiteur: 'Co-débiteur',
    signataire_solidaire: 'Signataire solidaire',
    garant: 'Garant',
    occupant: 'Occupant',
  };
  return labels[type] || type;
}
