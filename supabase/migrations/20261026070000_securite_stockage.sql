-- Sécurité du stockage (alertes critiques du scan Lovable du 26.10.2026 : règles de fichiers trop ouvertes).
-- 1) public-files (bucket public) : tout utilisateur connecté pouvait déposer n'importe où.
--    Restent autorisés : l'équipe (admin, agent), les annonceurs dans « annonces/ » (règle existante) et le
--    formulaire vendeur dans « leads/vendeurs/ » (seul autre usage dans le code).
-- 2) bien-medias (médias et documents des biens, privé) : tout utilisateur connecté pouvait tout lire.
--    Lecture réservée à l'équipe (seule la fiche détaillée des agents utilise ce bucket ; les liens signés
--    déjà créés restent valables).
-- Idempotente.

DROP POLICY IF EXISTS "Authenticated users can upload to public-files" ON storage.objects;
DROP POLICY IF EXISTS "public-files : depot equipe et formulaire vendeur" ON storage.objects;
CREATE POLICY "public-files : depot equipe et formulaire vendeur" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'agent'::app_role)
      OR ((storage.foldername(name))[1] = 'leads' AND (storage.foldername(name))[2] = 'vendeurs')
    )
  );

DROP POLICY IF EXISTS "bmedias auth read" ON storage.objects;
DROP POLICY IF EXISTS "bmedias lecture equipe" ON storage.objects;
CREATE POLICY "bmedias lecture equipe" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bien-medias'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  );
