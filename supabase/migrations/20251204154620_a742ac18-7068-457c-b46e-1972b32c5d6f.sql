-- Allow admins to insert offers
CREATE POLICY "Admins can insert offres"
ON public.offres
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update offers
CREATE POLICY "Admins can update offres"
ON public.offres
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));