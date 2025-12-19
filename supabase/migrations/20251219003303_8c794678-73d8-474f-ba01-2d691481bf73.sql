-- Politique pour permettre aux agents de voir/télécharger les documents dans le dossier mandat/
CREATE POLICY "Agents can view mandat documents for their clients" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = 'mandat'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN client_agents ca ON c.id = ca.client_id
    JOIN agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid()
  )
);

-- Politique pour permettre aux agents de supprimer les documents mandat/ de leurs clients
CREATE POLICY "Agents can delete mandat documents for their clients" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = 'mandat'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN client_agents ca ON c.id = ca.client_id
    JOIN agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid()
  )
);