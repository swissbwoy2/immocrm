/**
 * Constantes centralisées pour le disclaimer « Avant de continuer »
 * et les conditions détaillées du service de dépôt de candidature.
 * Modifier UNIQUEMENT ici.
 */
export const CANDIDACY_LEGAL = {
  /** Raison sociale exacte inscrite au registre / IDE */
  raisonSociale: '[RAISON SOCIALE EXACTE]',
  /** Adresse postale complète du responsable du traitement */
  adressePostale: '[adresse postale complète]',
  /** E-mail dédié à la protection des données */
  emailProtectionDonnees: '[e-mail protection des données]',
  /** Taux de TVA suisse applicable */
  tauxTVA: '8,1 %',
  /** Commission de courtage en cas de succès */
  commission: '1 mois de loyer brut',
  /** Durée de conservation après la fin du service */
  conservationJours: 90,
} as const;
