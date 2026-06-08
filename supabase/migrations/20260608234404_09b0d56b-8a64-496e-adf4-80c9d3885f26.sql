
-- 1) Storage policies: mandat-contracts INSERT/UPDATE restricted to service_role
DROP POLICY IF EXISTS "Service role can insert contracts" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update contracts" ON storage.objects;

CREATE POLICY "Service role can insert contracts"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'mandat-contracts');

CREATE POLICY "Service role can update contracts"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'mandat-contracts')
WITH CHECK (bucket_id = 'mandat-contracts');

-- 2) Renovation: require project membership for agents
CREATE OR REPLACE FUNCTION public.renovation_user_can_manage_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.renovation_project_members
      WHERE project_id = _project_id AND user_id = auth.uid() AND can_validate = true
    )
    OR (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agent')
      AND EXISTS (
        SELECT 1 FROM public.renovation_project_members
        WHERE project_id = _project_id AND user_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.renovation_user_can_view_project_internal(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.renovation_project_members
      WHERE project_id = _project_id AND user_id = auth.uid()
    );
$$;

-- 3) Switch SECURITY DEFINER-equivalent views to security_invoker
ALTER VIEW public.renovation_my_company_score_view SET (security_invoker = true);
ALTER VIEW public.renovation_projects_company_view SET (security_invoker = true);

-- 4) link_previews: authenticated only
DROP POLICY IF EXISTS "Allow public read link_previews" ON public.link_previews;
DROP POLICY IF EXISTS "Allow system insert link_previews" ON public.link_previews;
DROP POLICY IF EXISTS "Allow system update link_previews" ON public.link_previews;

CREATE POLICY "Authenticated can read link_previews"
ON public.link_previews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert link_previews"
ON public.link_previews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update link_previews"
ON public.link_previews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

REVOKE SELECT, INSERT, UPDATE ON public.link_previews FROM anon;

-- 5) annonces_publiques: hide contact PII from anon via column-level grants
REVOKE SELECT ON public.annonces_publiques FROM anon;
GRANT SELECT (
  id, annonceur_id, reference, categorie_id, type_transaction, sous_type,
  titre, description, description_courte, points_forts, mots_cles,
  adresse, adresse_complementaire, code_postal, ville, canton, pays, quartier,
  latitude, longitude, afficher_adresse_exacte,
  prix, prix_affichage, prix_au_m2, charges_mensuelles, charges_comprises,
  depot_garantie, nb_mois_garantie,
  surface_habitable, surface_utile, surface_terrain,
  nombre_pieces, nb_chambres, nb_salles_bain, nb_wc,
  etage, nb_etages_immeuble, annee_construction, annee_renovation, etat_bien,
  type_chauffage, source_energie, classe_energetique, indice_energetique, emissions_co2,
  balcon, surface_balcon, terrasse, surface_terrasse, jardin, surface_jardin, piscine,
  parking_inclus, nb_places_parking, type_parking, equipements,
  acces_pmr, animaux_autorises, fumeurs_acceptes,
  disponible_des, disponible_immediatement, duree_bail_min,
  nom_contact, horaires_contact,
  statut, date_publication, date_expiration, duree_publication, renouvellements,
  est_mise_en_avant, date_debut_mise_avant, date_fin_mise_avant, position_mise_avant,
  nb_vues, nb_vues_uniques, nb_favoris, nb_contacts, nb_partages,
  slug, meta_title, meta_description, source, external_id, created_at, updated_at
) ON public.annonces_publiques TO anon;
