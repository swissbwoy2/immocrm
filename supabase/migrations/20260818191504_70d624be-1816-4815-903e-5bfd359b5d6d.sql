CREATE TABLE public.dashboard_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  lien_url text,
  titre text,
  texte text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_banners TO authenticated;
GRANT ALL ON public.dashboard_banners TO service_role;

ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active banners"
ON public.dashboard_banners FOR SELECT TO authenticated
USING (actif = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert banners"
ON public.dashboard_banners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banners"
ON public.dashboard_banners FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banners"
ON public.dashboard_banners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER dashboard_banners_updated_at
BEFORE UPDATE ON public.dashboard_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read marketing assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'marketing-assets');

CREATE POLICY "Admins upload marketing assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marketing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update marketing assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'marketing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete marketing assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'marketing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));