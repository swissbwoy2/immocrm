-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Anyone can insert demande" ON public.demandes_mandat;

-- Create a permissive policy for public inserts
CREATE POLICY "Anyone can insert demande"
ON public.demandes_mandat
FOR INSERT
TO public
WITH CHECK (true);