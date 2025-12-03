-- Remove duplicate anonymous insert policies on demandes_mandat
-- Keep only one policy for public form submissions
DROP POLICY IF EXISTS "Allow anonymous insert demandes_mandat" ON public.demandes_mandat;
DROP POLICY IF EXISTS "Anyone can insert demande" ON public.demandes_mandat;

-- Create a single, clearly named policy for public mandate submissions
CREATE POLICY "Public can submit mandate requests"
ON public.demandes_mandat
FOR INSERT
WITH CHECK (true);