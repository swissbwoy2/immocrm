-- Ajouter une politique explicite pour permettre aux admins de supprimer des demandes de mandat
CREATE POLICY "Admins can delete demandes"
ON public.demandes_mandat
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));