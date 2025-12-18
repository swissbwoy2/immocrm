-- Corriger les URLs complètes en chemins relatifs dans la table documents
UPDATE documents 
SET url = REGEXP_REPLACE(url, '^https://[^/]+/storage/v1/object/public/client-documents/', '')
WHERE url LIKE 'https://%/storage/v1/object/public/client-documents/%';