/**
 * Configuration centralisée des types de documents.
 * Détermine quels types nécessitent obligatoirement un recto + verso.
 */

export type DocumentType =
  | 'piece_identite'
  | 'permis_sejour'
  | 'permis_conduire'
  | 'fiche_salaire'
  | 'extrait_poursuites'
  | 'attestation_employeur'
  | 'bail'
  | 'autre';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  piece_identite: "Pièce d'identité (CNI / Passeport)",
  permis_sejour: 'Permis de séjour',
  permis_conduire: 'Permis de conduire',
  fiche_salaire: 'Fiche de salaire',
  extrait_poursuites: 'Extrait des poursuites',
  attestation_employeur: "Attestation d'employeur",
  bail: 'Contrat de bail',
  autre: 'Autre document',
};

/**
 * Documents nécessitant OBLIGATOIREMENT un recto + verso.
 * Tous les documents officiels (cartes, permis, fiches multi-pages) sont concernés.
 */
export const DOCUMENT_REQUIRES_RECTO_VERSO: Record<DocumentType, boolean> = {
  piece_identite: true,       // ✅ recto + verso obligatoire
  permis_sejour: true,        // ✅ recto + verso obligatoire
  permis_conduire: false,     // un seul fichier suffit
  fiche_salaire: false,
  extrait_poursuites: false,
  attestation_employeur: false,
  bail: false,
  autre: false,
};

export function requiresRectoVerso(type: string): boolean {
  return DOCUMENT_REQUIRES_RECTO_VERSO[type as DocumentType] ?? false;
}

export function getDocumentLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}
