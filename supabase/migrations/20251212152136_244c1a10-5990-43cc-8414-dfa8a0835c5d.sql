-- Politique pour permettre aux admins de supprimer des transactions
CREATE POLICY "Admins can delete transactions" 
ON public.transactions 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de modifier des transactions
CREATE POLICY "Admins can update transactions" 
ON public.transactions 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));