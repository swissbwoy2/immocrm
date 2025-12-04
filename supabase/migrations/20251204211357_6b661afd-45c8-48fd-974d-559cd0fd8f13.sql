-- 1. Policy DELETE pour les agents sur la table offres
CREATE POLICY "Agents peuvent supprimer leurs offres"
ON public.offres
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = offres.agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- 2. Policy DELETE pour les agents sur la table documents liés aux offres
CREATE POLICY "Agents peuvent supprimer documents liés aux offres"
ON public.documents
FOR DELETE
TO authenticated
USING (
  offre_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM offres o
    JOIN agents a ON a.id = o.agent_id
    WHERE o.id = documents.offre_id 
    AND a.user_id = auth.uid()
  )
);