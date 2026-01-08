-- Extension de la table immeubles pour le module de vente professionnel complet
-- Ajout des champs d'estimation, d'analyse de marché et d'énergie

-- Champs Estimation détaillée
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_valeur_basse NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_valeur_haute NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_valeur_recommandee NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_prix_m2 NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_date DATE;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_methode TEXT DEFAULT 'comparaison';
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_notes TEXT;

-- Facteurs d'estimation (stockés en JSONB pour plus de flexibilité)
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS facteurs_positifs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS facteurs_negatifs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS potentiel_developpement TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS score_sous_exploitation INTEGER;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS recommandation_commercialisation TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS strategie_vente TEXT;

-- Champs Énergie et environnement
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS potentiel_solaire_aptitude TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS potentiel_solaire_exposition NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS niveau_bruit_jour INTEGER;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS niveau_bruit_nuit INTEGER;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS classe_energetique TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS indice_energetique NUMERIC;

-- Champs Cadastre et bâtiment supplémentaires
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS egid TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS egaid TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS zone_affectation TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS reglement_urbanisme TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS restrictions_parcelle JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS emprise_sol NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS volume_batiment NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS surface_reference_energetique NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS nb_logements INTEGER;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS classification_batiment TEXT;

-- Champs Marché (saisie manuelle ou import)
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS prix_m2_secteur NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS duree_publication_moyenne INTEGER;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS annonces_comparables JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS tendance_marche TEXT;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS evolution_prix_secteur NUMERIC;

-- Champs pour estimation des loyers (immeubles de rapport)
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS loyer_estime_hc NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS loyer_estime_cc NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS rendement_brut NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS rendement_net NUMERIC;

-- Données socio-économiques du secteur
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS donnees_socio_economiques JSONB DEFAULT '{}'::jsonb;

-- Champ pour stocker l'estimation agent existante renommé
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS estimation_agent NUMERIC;

-- Commentaires pour documentation
COMMENT ON COLUMN public.immeubles.estimation_valeur_basse IS 'Valeur basse de la fourchette d''estimation';
COMMENT ON COLUMN public.immeubles.estimation_valeur_haute IS 'Valeur haute de la fourchette d''estimation';
COMMENT ON COLUMN public.immeubles.estimation_valeur_recommandee IS 'Valeur recommandée pour la commercialisation';
COMMENT ON COLUMN public.immeubles.estimation_methode IS 'Méthode: hedoniste, comparaison, capitalisation, mixte';
COMMENT ON COLUMN public.immeubles.facteurs_positifs IS 'Liste des atouts du bien (JSON array)';
COMMENT ON COLUMN public.immeubles.facteurs_negatifs IS 'Liste des points à améliorer (JSON array)';
COMMENT ON COLUMN public.immeubles.score_sous_exploitation IS 'Score de 0-100 indiquant le potentiel de développement';
COMMENT ON COLUMN public.immeubles.classe_energetique IS 'Classe CECB: A, B, C, D, E, F, G';
COMMENT ON COLUMN public.immeubles.egid IS 'Identifiant fédéral du bâtiment';
COMMENT ON COLUMN public.immeubles.prix_m2_secteur IS 'Prix moyen au m2 dans le secteur';
COMMENT ON COLUMN public.immeubles.annonces_comparables IS 'Biens comparables pour analyse (JSON array)';