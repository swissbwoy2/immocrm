ALTER TABLE public.dashboard_banners
  ADD COLUMN IF NOT EXISTS lien_ios text,
  ADD COLUMN IF NOT EXISTS lien_android text;

GRANT SELECT ON public.dashboard_banners TO anon;

DROP POLICY IF EXISTS "Public can view active banner" ON public.dashboard_banners;
CREATE POLICY "Public can view active banner"
ON public.dashboard_banners
FOR SELECT
TO anon
USING (actif = true);