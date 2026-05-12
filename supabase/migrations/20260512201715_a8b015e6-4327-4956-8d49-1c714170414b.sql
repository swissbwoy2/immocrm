
-- 1. EMPLOYES: restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can manage employes" ON public.employes;
CREATE POLICY "Admins can manage employes"
ON public.employes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. FICHES_SALAIRE: restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can manage fiches_salaire" ON public.fiches_salaire;
CREATE POLICY "Admins can manage fiches_salaire"
ON public.fiches_salaire FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. SOURCE_CONNECTORS: drop overly permissive SELECT (admin policy already exists)
DROP POLICY IF EXISTS "authenticated_select_source_connectors" ON public.source_connectors;

-- 4. ANNONCEURS: drop public PII exposure, create safe public view
DROP POLICY IF EXISTS "Public can view active annonceurs" ON public.annonceurs;

CREATE OR REPLACE VIEW public.annonceurs_public
WITH (security_invoker = off) AS
SELECT
  id,
  type_annonceur,
  nom_entreprise,
  nom,
  prenom,
  ville,
  canton,
  logo_url,
  note_moyenne,
  nb_avis,
  est_verifie,
  statut,
  created_at
FROM public.annonceurs
WHERE statut = 'actif';

GRANT SELECT ON public.annonceurs_public TO anon, authenticated;

-- Allow authenticated annonceur owners to still see their own row (they already had a policy via user_id; ensure verification is possible during signup re-checks)
-- Existing policies "Users can manage own annonceur profile" and "Admins can manage all annonceurs" remain.

-- 5. LEAD_PHONE_APPOINTMENTS: drop public PII exposure; rely on existing security-definer view
DROP POLICY IF EXISTS "Public can read slot availability" ON public.lead_phone_appointments;

-- Recreate view to ensure it runs as definer (owner privileges, bypasses RLS) and is granted to anon/auth
CREATE OR REPLACE VIEW public.available_phone_slots
WITH (security_invoker = off) AS
SELECT slot_start, status
FROM public.lead_phone_appointments
WHERE status <> 'annule' AND slot_start >= now();

GRANT SELECT ON public.available_phone_slots TO anon, authenticated;

-- 6. STORAGE: mandat-contracts — drop the blanket policy
DROP POLICY IF EXISTS "Users can view their own contracts" ON storage.objects;

-- 7. STORAGE: documents_immeuble — replace blanket policies with scoped ones
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Helper: check that the first or second path segment is a uuid that the user has access to
-- Path conventions in this project:
--   <immeuble_id>/<filename>            (AddImmeubleDialog)
--   <user_id>/<immeuble_id>/<filename>  (UploadDocumentDialog, where user_id is the proprietaire)

CREATE POLICY "Owners and agents can read immeuble documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents_immeuble'
  AND (
    -- pattern A: first folder is the immeuble_id
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[1])::uuid)
    )
    OR
    -- pattern B: <user_id>/<immeuble_id>/...
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[2])::uuid)
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Owners and agents can insert immeuble documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents_immeuble'
  AND (
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[1])::uuid)
    )
    OR
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[2])::uuid)
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Owners and agents can delete immeuble documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents_immeuble'
  AND (
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[1])::uuid)
    )
    OR
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.has_access_to_immeuble(((storage.foldername(name))[2])::uuid)
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
