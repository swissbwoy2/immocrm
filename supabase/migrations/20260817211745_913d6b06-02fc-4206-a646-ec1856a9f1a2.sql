DROP POLICY IF EXISTS "Public can view advertisers of published annonces" ON public.annonceurs;
REVOKE SELECT ON public.annonceurs FROM anon;