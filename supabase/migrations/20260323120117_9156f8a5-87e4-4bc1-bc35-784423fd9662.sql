INSERT INTO storage.buckets (id, name, public) 
VALUES ('brochure-templates', 'brochure-templates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read brochure templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'brochure-templates');

CREATE POLICY "Service role can manage brochure templates"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'brochure-templates');