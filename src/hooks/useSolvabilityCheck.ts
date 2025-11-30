import { useMemo } from 'react';
import { ClientCandidate, CUMULATIVE_TYPES } from './useClientCandidates';

export interface SolvabilityProblem {
  type: 'critical' | 'warning';
  code: 'POURSUITES' | 'INSUFFICIENT_INCOME' | 'GARANT_POURSUITES' | 'GARANT_INSUFFICIENT';
  message: string;
  solution: string;
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
  };
}

interface ClientData {
  revenus_mensuels?: number;
  budget_max?: number;
  poursuites?: boolean;
}

export function useSolvabilityCheck(
  client: ClientData | null,
  candidates: ClientCandidate[]
): SolvabilityResult {
  return useMemo(() => {
    const problems: SolvabilityProblem[] = [];
    
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
      };
    }

    const clientRevenus = client.revenus_mensuels || 0;
    const budgetDemande = client.budget_max || 0;
    
    // Calculer les revenus des co-débiteurs/colocataires/signataires (ceux qui cumulent)
    const candidatesRevenus = candidates
      .filter(c => CUMULATIVE_TYPES.includes(c.type) && !c.poursuites)
      .reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
    
    const totalRevenus = clientRevenus + candidatesRevenus;
    const budgetPossible = Math.round(totalRevenus / 3);
    
    // Compter les contributeurs (client + co-débiteurs valides)
    const contributeurs = 1 + candidates.filter(c => 
      CUMULATIVE_TYPES.includes(c.type) && !c.poursuites
    ).length;
    
    // Vérifier les garants
    const garants = candidates.filter(c => c.type === 'garant');
    const validGarant = garants.find(g => 
      !g.poursuites && 
      (g.revenus_mensuels || 0) >= budgetDemande * 3
    );
    
    let garantInfo;
    if (validGarant) {
      garantInfo = {
        nom: `${validGarant.prenom} ${validGarant.nom}`,
        revenus: validGarant.revenus_mensuels || 0,
        maxLoyer: Math.round((validGarant.revenus_mensuels || 0) / 3),
      };
    }
    
    // 1. Vérifier si le client a des poursuites
    if (client.poursuites) {
      problems.push({
        type: 'critical',
        code: 'POURSUITES',
        message: 'Vous avez des poursuites inscrites',
        solution: 'Ajouter un GARANT obligatoire (sans poursuites, revenus >= 3x le loyer)',
      });
    }
    
    // 2. Vérifier si les revenus sont suffisants pour le budget demandé
    if (budgetDemande > 0 && budgetDemande > budgetPossible && !validGarant) {
      problems.push({
        type: 'warning',
        code: 'INSUFFICIENT_INCOME',
        message: `Budget demandé (CHF ${budgetDemande.toLocaleString()}) supérieur au budget possible (CHF ${budgetPossible.toLocaleString()})`,
        solution: 'Ajouter un CO-DÉBITEUR ou un GARANT pour augmenter votre capacité',
      });
    }
    
    // 3. Vérifier les garants avec poursuites
    const garantsAvecPoursuites = garants.filter(g => g.poursuites);
    if (garantsAvecPoursuites.length > 0) {
      garantsAvecPoursuites.forEach(g => {
        problems.push({
          type: 'warning',
          code: 'GARANT_POURSUITES',
          message: `Le garant ${g.prenom} ${g.nom} a des poursuites`,
          solution: 'Un garant ne peut pas avoir de poursuites. Veuillez modifier ou remplacer ce garant.',
        });
      });
    }
    
    // 4. Vérifier les garants avec revenus insuffisants
    const garantsInsuffisants = garants.filter(g => 
      !g.poursuites && 
      (g.revenus_mensuels || 0) < budgetDemande * 3 &&
      budgetDemande > 0
    );
    if (garantsInsuffisants.length > 0 && !validGarant) {
      garantsInsuffisants.forEach(g => {
        const revenus = g.revenus_mensuels || 0;
        const minRequired = budgetDemande * 3;
        problems.push({
          type: 'warning',
          code: 'GARANT_INSUFFICIENT',
          message: `Le garant ${g.prenom} ${g.nom} a des revenus insuffisants (CHF ${revenus.toLocaleString()} < CHF ${minRequired.toLocaleString()} requis)`,
          solution: `Le garant doit avoir des revenus >= 3x le loyer demandé (${budgetDemande} x 3 = CHF ${minRequired.toLocaleString()})`,
        });
      });
    }
    
    // Déterminer si le dossier est solvable
    const hasCriticalProblems = problems.some(p => p.type === 'critical');
    const hasInsufficientIncome = problems.some(p => p.code === 'INSUFFICIENT_INCOME');
    
    // Solvable si:
    // - Pas de problèmes critiques sans garant valide
    // - Budget possible >= budget demandé OU garant valide
    const isSolvable = 
      (!hasCriticalProblems || validGarant !== undefined) &&
      (!hasInsufficientIncome || validGarant !== undefined || budgetPossible >= budgetDemande);
    
    return {
      isSolvable,
      problems,
      budgetPossible,
      budgetDemande,
      totalRevenus,
      clientRevenus,
      candidatesRevenus,
      contributeurs,
      hasValidGarant: validGarant !== undefined,
      garantInfo,
    };
  }, [client, candidates]);
}
