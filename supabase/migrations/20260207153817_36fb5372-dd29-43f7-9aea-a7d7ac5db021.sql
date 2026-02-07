
-- Ajout des champs pour le rapport d'estimation Popety.io
-- Section Marché
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS prix_median_secteur numeric;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS evolution_prix_median_1an numeric;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS nb_biens_comparables integer;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS nb_nouvelles_annonces integer;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS donnees_distribution_prix jsonb;

-- Section Bâtiment
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS categorie_ofs text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS classification_ofs text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS numero_officiel_batiment text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS logements_details jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS emprise_sol_m2 numeric;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS surface_logement_totale numeric;

-- Section Parcelle
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS surface_parcelle numeric;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS egrid text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS type_parcelle text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS plan_affectation_type text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS plan_affectation_nom text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS restrictions_parcelle jsonb;

-- Section Énergie
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS source_energie_chauffage text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS systeme_chauffage_principal jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS systeme_eau_chaude jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS systeme_chauffage_supplementaire jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS systeme_eau_chaude_supplementaire jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS installation_solaire_actuelle text;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS potentiel_solaire jsonb;

-- Section Commodités
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS commodites_scores jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS commodites_details jsonb;

-- Section Accessibilité
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS accessibilite_data jsonb;

-- Section Bruit (détaillé)
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS bruit_routier_jour integer;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS bruit_routier_nuit integer;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS bruit_ferroviaire_jour integer;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS bruit_ferroviaire_nuit integer;

-- Section Ensoleillement
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS ensoleillement_data jsonb;

-- Section Permis de construire
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS permis_construire jsonb;

-- Images du rapport d'estimation (clés mappées aux sections)
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS rapport_estimation_images jsonb;
