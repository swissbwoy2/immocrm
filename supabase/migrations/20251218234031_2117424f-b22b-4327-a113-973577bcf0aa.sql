-- Récupération des documents manquants pour les clients existants
-- Transfert depuis demandes_mandat.documents_uploades vers la table documents

INSERT INTO documents (user_id, client_id, nom, url, type, type_document, statut, date_upload)
SELECT 
  c.user_id,
  c.id as client_id,
  doc->>'name' as nom,
  doc->>'url' as url,
  CASE 
    WHEN (doc->>'name') ILIKE '%.pdf' THEN 'application/pdf'
    WHEN (doc->>'name') ILIKE '%.jpg' OR (doc->>'name') ILIKE '%.jpeg' THEN 'image/jpeg'
    WHEN (doc->>'name') ILIKE '%.png' THEN 'image/png'
    ELSE 'application/octet-stream'
  END as type,
  CASE (doc->>'type')
    WHEN 'poursuites' THEN 'extrait_poursuites'
    WHEN 'salaire1' THEN 'fiche_salaire'
    WHEN 'salaire2' THEN 'fiche_salaire'
    WHEN 'salaire3' THEN 'fiche_salaire'
    WHEN 'identite' THEN 'piece_identite'
    ELSE doc->>'type'
  END as type_document,
  'validé' as statut,
  dm.created_at as date_upload
FROM demandes_mandat dm
CROSS JOIN LATERAL jsonb_array_elements(dm.documents_uploades) as doc
JOIN profiles p ON LOWER(p.email) = LOWER(dm.email)
JOIN clients c ON c.user_id = p.id
WHERE dm.documents_uploades IS NOT NULL
  AND jsonb_array_length(dm.documents_uploades) > 0
  AND NOT EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.client_id = c.id 
    AND d.url = doc->>'url'
  );