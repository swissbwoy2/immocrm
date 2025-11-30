-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_document_check;

-- Créer la nouvelle contrainte avec tous les types de documents
ALTER TABLE public.documents ADD CONSTRAINT documents_type_document_check 
CHECK (type_document IS NULL OR type_document = ANY (ARRAY[
  'fiche_salaire'::text, 
  'extrait_poursuites'::text, 
  'piece_identite'::text, 
  'attestation_domicile'::text,
  'rc_menage'::text,
  'contrat_travail'::text,
  'attestation_employeur'::text,
  'copie_bail'::text,
  'attestation_garantie_loyer'::text,
  'dossier_complet'::text,
  'autre'::text
]));