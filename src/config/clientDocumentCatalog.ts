/**
 * Pièces que le client peut déposer directement dans son dossier depuis la messagerie.
 * Les types et catégories sont ceux de la page « Mes documents » (src/pages/client/Documents.tsx)
 * et de la contrainte documents_type_document_check : un fichier déposé ici apparaît au même endroit.
 */

export type DossierJourney = 'location' | 'achat';

export interface DossierDocumentOption {
  /** Valeur de documents.type_document */
  type: string;
  /** Libellé affiché au client */
  label: string;
  emoji: string;
  /** Rappel affiché avant le dépôt (recto-verso, date…) */
  hint?: string;
}

export const AUTRE_DOCUMENT: DossierDocumentOption = {
  type: 'autre',
  label: 'Autre(s)',
  emoji: '📄',
  hint: 'Tout autre document ou fichier utile à ton dossier.',
};

export const RENTAL_DOSSIER_DOCUMENTS: DossierDocumentOption[] = [
  { type: 'piece_identite', label: "Pièce d'identité", emoji: '🪪', hint: 'Recto et verso : ajoute les deux faces.' },
  { type: 'permis_sejour', label: 'Permis de séjour', emoji: '🪪', hint: 'Recto et verso : ajoute les deux faces.' },
  { type: 'contrat_travail', label: 'Contrat de travail', emoji: '📝' },
  { type: 'fiche_salaire', label: 'Fiche de salaire', emoji: '💰', hint: 'Les 3 dernières : ajoute-les une par une.' },
  { type: 'extrait_poursuites', label: 'Extrait des poursuites', emoji: '📋', hint: 'Daté de moins de 3 mois.' },
  { type: 'rc_menage', label: 'Assurance RC ménage', emoji: '🛡️' },
  { type: 'attestation_domicile', label: 'Attestation de domicile', emoji: '🏠' },
  { type: 'attestation_employeur', label: "Attestation de l'employeur", emoji: '👔' },
  { type: 'copie_bail', label: 'Copie du bail', emoji: '📋' },
  { type: 'attestation_garantie_loyer', label: 'Attestation de garantie de loyer', emoji: '🔐' },
  AUTRE_DOCUMENT,
];

export const PURCHASE_DOSSIER_DOCUMENTS: DossierDocumentOption[] = [
  { type: 'piece_identite', label: "Pièce d'identité", emoji: '🪪', hint: 'Recto et verso : ajoute les deux faces.' },
  { type: 'permis_sejour', label: 'Permis de séjour', emoji: '🪪', hint: 'Recto et verso : ajoute les deux faces.' },
  { type: 'extrait_poursuites', label: 'Extrait des poursuites', emoji: '📋', hint: 'Daté de moins de 3 mois.' },
  { type: 'certificat_salaire', label: 'Certificat de salaire annuel', emoji: '💰' },
  { type: 'fiche_salaire', label: 'Fiche de salaire', emoji: '💰', hint: 'Les 3 dernières : ajoute-les une par une.' },
  { type: 'contrat_travail', label: 'Contrat de travail', emoji: '📝' },
  { type: 'attestation_employeur', label: "Attestation de l'employeur", emoji: '👔' },
  { type: 'releve_bancaire_fonds_propres', label: 'Relevé bancaire des fonds propres', emoji: '🏦' },
  { type: 'attestation_3a', label: 'Attestation 3e pilier (3a)', emoji: '🏦' },
  { type: 'attestation_lpp', label: 'Attestation LPP', emoji: '🏦' },
  { type: 'attestation_epl', label: 'Attestation EPL / libre passage', emoji: '🏦' },
  { type: 'justificatif_donation', label: "Donation, avance d'hoirie", emoji: '🎁' },
  { type: 'decision_taxation', label: 'Décision de taxation', emoji: '📋' },
  { type: 'declaration_fiscale', label: 'Déclaration fiscale', emoji: '📋' },
  { type: 'justificatif_credit_prive', label: 'Crédit privé, leasing, carte de crédit', emoji: '💳' },
  { type: 'justificatif_pension_alimentaire', label: 'Pension alimentaire', emoji: '👶' },
  AUTRE_DOCUMENT,
];

/** Catégorie du projet d'achat (documents.purchase_category), identique à la page « Mes documents ». */
export const PURCHASE_DOC_CATEGORY: Record<string, string> = {
  piece_identite: 'identite', permis_sejour: 'identite',
  certificat_salaire: 'revenus', fiche_salaire_1: 'revenus', fiche_salaire_2: 'revenus',
  fiche_salaire_3: 'revenus', fiche_salaire: 'revenus',
  contrat_travail: 'revenus', attestation_employeur: 'revenus',
  releve_bancaire_fonds_propres: 'fonds_propres', attestation_3a: 'fonds_propres',
  attestation_lpp: 'fonds_propres', attestation_epl: 'fonds_propres',
  attestation_libre_passage: 'fonds_propres', justificatif_placements: 'fonds_propres',
  justificatif_donation: 'fonds_propres', justificatif_avance_hoirie: 'fonds_propres',
  justificatif_credit_prive: 'charges', justificatif_leasing: 'charges',
  justificatif_carte_credit: 'charges', justificatif_pension_alimentaire: 'charges',
  justificatif_charges_fixes: 'charges',
  decision_taxation: 'fiscalite', declaration_fiscale: 'fiscalite',
  extrait_poursuites: 'autre',
  accord_transmission: 'autorisation', consentement_donnees: 'autorisation',
  autre: 'autre',
};

export function dossierDocumentsFor(journey: DossierJourney): DossierDocumentOption[] {
  return journey === 'achat' ? PURCHASE_DOSSIER_DOCUMENTS : RENTAL_DOSSIER_DOCUMENTS;
}

export function dossierDocumentLabel(type: string, journey: DossierJourney = 'location'): string {
  return dossierDocumentsFor(journey).find((d) => d.type === type)?.label
    ?? [...RENTAL_DOSSIER_DOCUMENTS, ...PURCHASE_DOSSIER_DOCUMENTS].find((d) => d.type === type)?.label
    ?? 'Document';
}

/** Formats acceptés pour une pièce du dossier : ceux de la page « Mes documents » (PDF, JPG, PNG). */
export const DOSSIER_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const DOSSIER_ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
/** « Autre(s) » accepte aussi les documents bureautiques et les photos modernes. */
export const AUTRE_ACCEPT = `${DOSSIER_ACCEPT},.doc,.docx,.xls,.xlsx,.heic,.webp,image/*`;
export const AUTRE_ALLOWED_MIME = [
  ...DOSSIER_ALLOWED_MIME,
  'image/heic', 'image/heif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const DOSSIER_MAX_BYTES = 20 * 1024 * 1024;
