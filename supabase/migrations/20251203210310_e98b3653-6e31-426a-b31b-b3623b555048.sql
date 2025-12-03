-- Add INSERT policy for admins on renouvellements_mandat
CREATE POLICY "Admins can insert renewals"
ON public.renouvellements_mandat
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy for admins on renouvellements_mandat  
CREATE POLICY "Admins can update renewals"
ON public.renouvellements_mandat
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));