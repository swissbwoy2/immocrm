-- ÉTAPE 1: Créer le bucket Supabase Storage pour les documents clients
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
);

-- RLS Policies pour le bucket Storage
CREATE POLICY "Clients peuvent uploader leurs documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Clients peuvent voir leurs documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Agents peuvent voir documents de leurs clients"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins peuvent tout voir"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Clients peuvent supprimer leurs documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ÉTAPE 2: Migration de la table documents
-- Ajouter type_document pour catégoriser les documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS type_document text CHECK (type_document IN (
  'fiche_salaire', 
  'extrait_poursuites', 
  'piece_identite', 
  'autre'
));

-- Ajouter offre_id pour lier les documents aux candidatures
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS offre_id uuid REFERENCES offres(id) ON DELETE SET NULL;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_documents_offre_id ON documents(offre_id);
CREATE INDEX IF NOT EXISTS idx_documents_type_document ON documents(type_document);
CREATE INDEX IF NOT EXISTS idx_documents_client_user ON documents(user_id, client_id);

-- ÉTAPE 3: Créer la table candidatures
CREATE TABLE IF NOT EXISTS candidatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id uuid NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message_client text,
  dossier_complet boolean DEFAULT false,
  date_depot timestamp with time zone DEFAULT now(),
  statut text DEFAULT 'en_attente' CHECK (statut IN (
    'en_attente', 
    'acceptee', 
    'refusee'
  )),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies pour candidatures
ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients peuvent voir leurs candidatures"
ON candidatures FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = candidatures.client_id
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Clients peuvent créer leurs candidatures"
ON candidatures FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = candidatures.client_id
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Agents peuvent voir candidatures de leurs clients"
ON candidatures FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins peuvent tout gérer"
ON candidatures FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at sur candidatures
CREATE TRIGGER update_candidatures_updated_at
  BEFORE UPDATE ON candidatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();