// Scoring automatique des prospects location issus du formulaire /rendez-vous
// 6 questions Q1..Q6 -> statut + ratio + risque + résumé + motif + recommandation

export type StatutSuisse =
  | 'Suisse'
  | 'Permis C'
  | 'Permis B'
  | 'Permis L'
  | 'Permis F'
  | 'Permis N'
  | 'Permis G'
  | 'Sans permis valable'
  | 'Autre';

export type SituationPro =
  | 'CDI'
  | 'CDD'
  | 'Indépendant'
  | 'Apprenti / Étudiant'
  | 'Retraité'
  | 'Sans emploi'
  | 'Aide sociale'
  | 'AI'
  | 'Chômage'
  | 'Autre';

export type PoursuitesStatut =
  | 'Aucune'
  | 'En cours'
  | 'Actes de défaut de biens'
  | 'Je ne sais pas'
  | 'Pas encore d\'extrait';

export type QualificationStatut = 'qualifie' | 'a_verifier' | 'a_reorienter' | 'non_qualifie';
export type RisqueNiveau = 'faible' | 'moyen' | 'eleve';

export interface QualificationInput {
  statutSuisse: StatutSuisse;
  situationPro: SituationPro;
  poursuites: PoursuitesStatut;
  nbPieces: string;
  localite: string;
  budgetChf: number;
  revenuChf: number;
}

export interface QualificationResult {
  statut: QualificationStatut;
  ratio: number; // arrondi à 1 décimale
  risque: RisqueNiveau;
  motif: string;
  resume: string;
  recommandation: string;
}

const PERMIS_STABLES: StatutSuisse[] = ['Suisse', 'Permis C', 'Permis B', 'Permis G'];
const EMPLOI_STABLES: SituationPro[] = ['CDI', 'Indépendant', 'Retraité'];
const EMPLOI_GRIS: SituationPro[] = ['CDD', 'Apprenti / Étudiant', 'Autre'];

export function qualifyLead(input: QualificationInput): QualificationResult {
  const { statutSuisse, situationPro, poursuites, nbPieces, localite, budgetChf, revenuChf } = input;

  const ratioRaw = budgetChf > 0 ? revenuChf / budgetChf : 0;
  const ratio = Math.round(ratioRaw * 10) / 10;

  const permisStable = PERMIS_STABLES.includes(statutSuisse);
  const permisBloquant = statutSuisse === 'Sans permis valable';

  const emploiStable = EMPLOI_STABLES.includes(situationPro);
  const emploiGris = EMPLOI_GRIS.includes(situationPro);
  const emploiFragile = !emploiStable && !emploiGris; // sans emploi / aide sociale / AI / chômage

  const poursuitesOk = poursuites === 'Aucune';
  const poursuitesGris = poursuites === 'Je ne sais pas' || poursuites === "Pas encore d'extrait";
  const poursuitesBloquant = poursuites === 'En cours' || poursuites === 'Actes de défaut de biens';

  // ----- Statut -----
  let statut: QualificationStatut;
  const motifs: string[] = [];

  if (poursuitesBloquant || permisBloquant || (emploiFragile && ratio < 2)) {
    statut = 'non_qualifie';
    if (poursuitesBloquant) motifs.push(`poursuites confirmées (${poursuites})`);
    if (permisBloquant) motifs.push('aucun permis valable');
    if (emploiFragile && ratio < 2) motifs.push(`situation fragile (${situationPro}) et ratio ${ratio}x`);
  } else if (ratio < 3) {
    statut = 'a_reorienter';
    motifs.push(`ratio revenu/loyer de ${ratio}x (seuil recommandé 3x)`);
  } else if (poursuitesGris || emploiGris || (!permisStable && !permisBloquant)) {
    statut = 'a_verifier';
    if (poursuitesGris) motifs.push(`poursuites à confirmer (${poursuites})`);
    if (emploiGris) motifs.push(`situation pro à clarifier (${situationPro})`);
    if (!permisStable && !permisBloquant) motifs.push(`permis "${statutSuisse}" à valider`);
  } else {
    statut = 'qualifie';
    motifs.push(`ratio ${ratio}x, ${statutSuisse}, ${situationPro}, aucune poursuite`);
  }

  // ----- Risque -----
  const risque: RisqueNiveau =
    statut === 'qualifie' ? 'faible' : statut === 'non_qualifie' ? 'eleve' : 'moyen';

  // ----- Résumé -----
  const budgetFmt = budgetChf.toLocaleString('fr-CH');
  const revenuFmt = revenuChf.toLocaleString('fr-CH');
  const lieu = localite.trim() || 'région non précisée';
  const resume = `Recherche un ${nbPieces} à ${lieu} avec un budget de CHF ${budgetFmt}.-/mois. Revenu net du ménage CHF ${revenuFmt}.-, soit un ratio de ${ratio}x le loyer.`;

  // ----- Recommandation -----
  let recommandation: string;
  switch (statut) {
    case 'qualifie':
      recommandation = 'Confirmer le RDV et préparer le dossier candidature complet.';
      break;
    case 'a_verifier':
      recommandation = `Confirmer le RDV. À valider : ${motifs.join(' ; ')}.`;
      break;
    case 'a_reorienter': {
      const pistes: string[] = [];
      const pieces = parseFloat(String(nbPieces).replace(',', '.'));
      if (!isNaN(pieces) && pieces > 2) pistes.push(`réduire à ${Math.max(1.5, pieces - 1)} pièces`);
      const loyerCible = Math.round(revenuChf / 3 / 50) * 50;
      if (loyerCible > 0) pistes.push(`cibler max CHF ${loyerCible.toLocaleString('fr-CH')}.-/mois`);
      pistes.push('proposer un garant ou co-débiteur');
      pistes.push('élargir les localités');
      recommandation = `Confirmer le RDV et orienter le prospect : ${pistes.join(' ; ')}.`;
      break;
    }
    case 'non_qualifie':
      recommandation =
        'Ne PAS confirmer automatiquement le créneau. Rappeler le prospect pour évaluer une stratégie : garant solide, baisse du budget, mise en règle des poursuites.';
      break;
  }

  return {
    statut,
    ratio,
    risque,
    motif: motifs.join(' · '),
    resume,
    recommandation,
  };
}

export const STATUT_LABELS: Record<QualificationStatut, string> = {
  qualifie: 'Qualifié',
  a_verifier: 'À vérifier',
  a_reorienter: 'À réorienter',
  non_qualifie: 'Non qualifié',
};

export const STATUT_COLORS: Record<QualificationStatut, string> = {
  qualifie: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  a_verifier: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  a_reorienter: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
  non_qualifie: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
};
