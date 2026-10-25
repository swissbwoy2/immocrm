-- Steeve sur le site public : recherche d'offres pour les visiteurs (sans compte).
-- Additive et idempotente. Lecture seule, réservée à la clé de service (fonction steeve-public).
-- Sources :
--  - le portail Logisorama (annonces_publiques publiées, location ou vente), avec lien et photo ;
--  - les offres repérées par l'équipe sur immobilier.ch, Homegate, Flatfox… (table offres, location) :
--    validées par un agent (date_envoi), des 21 derniers jours, sans adresse exacte, sans lien vers le portail
--    d'origine ni contact. Un bien qu'un client de l'agence est en train d'obtenir (intéressé, visite,
--    candidature, acceptée) n'est jamais proposé à un visiteur.

CREATE OR REPLACE FUNCTION public.steeve_public_search(p_criteria jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c jsonb := CASE WHEN jsonb_typeof(p_criteria) = 'object' THEN p_criteria ELSE '{}'::jsonb END;
  v_tx text := CASE WHEN lower(coalesce(v_c ->> 'transaction', '')) IN ('achat', 'vente', 'acheter') THEN 'vente' ELSE 'location' END;
  v_num_rx constant text := '^[0-9]{1,9}(\.[0-9]{1,2})?$';
  v_pmin numeric;
  v_pmax numeric;
  v_budget numeric;
  v_smin numeric;
  v_names text[] := '{}';
  v_npas text[] := '{}';
  v_mots text[] := '{}';
  v_item text;
  v_limit int := 3;
  v_result jsonb;
BEGIN
  v_pmin := CASE WHEN v_c ->> 'pieces_min' ~ v_num_rx THEN (v_c ->> 'pieces_min')::numeric END;
  v_pmax := CASE WHEN v_c ->> 'pieces_max' ~ v_num_rx THEN (v_c ->> 'pieces_max')::numeric END;
  v_budget := CASE WHEN v_c ->> 'budget_max' ~ v_num_rx THEN (v_c ->> 'budget_max')::numeric END;
  v_smin := CASE WHEN v_c ->> 'surface_min' ~ v_num_rx THEN (v_c ->> 'surface_min')::numeric END;

  -- Lieux : NPA (4 chiffres) ou nom de commune, comparés sans accents ni tirets.
  IF jsonb_typeof(v_c -> 'lieux') = 'array' THEN
    FOR v_item IN SELECT left(trim(x), 40) FROM jsonb_array_elements_text(v_c -> 'lieux') x LIMIT 8 LOOP
      IF v_item ~ '^[0-9]{4}$' THEN
        v_npas := v_npas || v_item;
      ELSIF length(v_item) >= 2 THEN
        v_names := v_names || regexp_replace(replace(public.steeve_norm(v_item), '-', ' '), '\s+', ' ', 'g');
      END IF;
    END LOOP;
  END IF;
  -- Mots recherchés dans la description (« lac », « balcon », « terrasse »…).
  IF jsonb_typeof(v_c -> 'mots') = 'array' THEN
    SELECT coalesce(array_agg(DISTINCT m), '{}') INTO v_mots
      FROM (SELECT trim(regexp_replace(public.steeve_norm(left(x, 30)), '[^a-z0-9 ]', '', 'g')) m
              FROM jsonb_array_elements_text(v_c -> 'mots') x LIMIT 5) s
     WHERE length(m) >= 3;
  END IF;

  WITH portail AS (
    SELECT 'P-' || left(a.id::text, 8) AS ref, 'portail'::text AS source,
           coalesce(nullif(trim(a.titre), ''), 'Bien à ' || coalesce(a.ville, '')) AS titre,
           a.nombre_pieces AS pieces, a.surface_habitable AS surface, a.prix,
           a.charges_mensuelles AS charges, a.ville, a.code_postal AS npa,
           CASE WHEN a.disponible_immediatement THEN 'tout de suite'
                WHEN a.disponible_des IS NOT NULL THEN to_char(a.disponible_des, 'DD.MM.YYYY') END AS disponibilite,
           coalesce(nullif(trim(a.description_courte), ''), a.description) AS texte,
           public.steeve_norm(coalesce(a.titre, '') || ' ' || coalesce(a.description, '') || ' ' || coalesce(a.description_courte, '')
             || ' ' || coalesce(array_to_string(a.points_forts, ' '), '') || ' ' || coalesce(a.equipements::text, '')) AS hay,
           'https://logisorama.ch/annonces/' || a.slug AS lien,
           (SELECT coalesce(nullif(ph.url_thumbnail, ''), ph.url) FROM public.photos_annonces_publiques ph
             WHERE ph.annonce_id = a.id AND coalesce(ph.type_media, 'photo') <> 'video'
             ORDER BY ph.est_principale DESC NULLS LAST, ph.ordre NULLS LAST LIMIT 1) AS photo,
           coalesce(a.date_publication, a.created_at) AS publie_le,
           0 AS rang
      FROM public.annonces_publiques a
     WHERE a.statut = 'publie'
       AND (a.date_expiration IS NULL OR a.date_expiration > now())
       AND a.type_transaction = v_tx
       AND a.slug IS NOT NULL
  ), pris AS (
    -- Biens qu'un client de l'agence est en train d'obtenir : jamais proposés à un visiteur.
    SELECT DISTINCT coalesce(nullif(trim(x.lien_annonce), ''), x.adresse || '|' || x.prix::text) AS cle
      FROM public.offres x
     WHERE v_tx = 'location'
       AND x.statut IN ('interesse', 'souhaite_postuler', 'candidature_deposee', 'visite_planifiee',
                        'visite_confirmee', 'visite_effectuee', 'acceptee')
       AND coalesce(x.date_envoi, x.created_at) >= now() - interval '90 days'
  ), recentes AS (
    SELECT o.*, coalesce(nullif(trim(o.lien_annonce), ''), o.adresse || '|' || o.prix::text) AS cle
      FROM public.offres o
     WHERE v_tx = 'location'
       AND o.statut IN ('envoyee', 'refusee')
       AND o.date_envoi IS NOT NULL
       AND o.date_envoi >= now() - interval '21 days'
       AND o.adresse IS NOT NULL
       AND o.prix IS NOT NULL
  ), equipe AS (
    SELECT DISTINCT ON (o.cle)
           'E-' || left(o.id::text, 8) AS ref, 'equipe'::text AS source,
           concat_ws(' ', coalesce(nullif(o.type_bien, ''), 'Appartement'),
                     CASE WHEN o.pieces IS NOT NULL THEN trim(to_char(o.pieces, 'FM990.0')) || ' pièces' END) AS titre,
           o.pieces, o.surface, o.prix, NULL::numeric AS charges,
           nullif(trim(regexp_replace(coalesce(substring(o.adresse FROM '[0-9]{4}\s+(.+)$'), split_part(o.adresse, ',', -1)), '\s+', ' ', 'g')), '') AS ville,
           substring(o.adresse FROM '([0-9]{4})') AS npa,
           o.disponibilite,
           -- Sans nom de rue ni numéro : l'adresse exacte reste réservée au client et à son agent.
           regexp_replace(coalesce(nullif(trim(o.description_marketing), ''), o.description),
             '\m(Rue|rue|Avenue|avenue|Av\.|av\.|Chemin|chemin|Ch\.|ch\.|Route|route|Rte|rte|Boulevard|boulevard|Bd|bd|Quai|quai|All[ée]e|all[ée]e|Impasse|impasse|Sentier|sentier|Promenade|promenade|Ruelle|ruelle|Place|place|Passage|passage)'
             '[[:space:]]+((de la|de l''|du|des|de|d'')[[:space:]]*)?[A-ZÀ-Ý][[:alnum:]À-ÿ''-]*([[:space:]]+[A-ZÀ-Ý][[:alnum:]À-ÿ''-]*)*([[:space:]]+[0-9]+[a-zA-Z]?)?',
             '[adresse]', 'g') AS texte,
           public.steeve_norm(coalesce(o.titre, '') || ' ' || coalesce(o.description, '') || ' ' || coalesce(o.description_marketing, '')
             || ' ' || coalesce(array_to_string(o.equipements, ' '), '')) AS hay,
           NULL::text AS lien, NULL::text AS photo,
           o.date_envoi AS publie_le,
           1 AS rang
      FROM recentes o
     WHERE NOT EXISTS (SELECT 1 FROM pris WHERE pris.cle = o.cle)
     -- Doublons (même annonce envoyée à plusieurs clients) : la fiche la plus complète, puis la plus récente.
     ORDER BY o.cle, (nullif(trim(coalesce(o.description_marketing, o.description, '')), '') IS NULL), o.date_envoi DESC
  ), tout AS (
    SELECT * FROM portail UNION ALL SELECT * FROM equipe
  ), filtre AS (
    SELECT t.*,
           -- Mot entier, pluriel accepté : « lac » trouve « lac » et « lacs », pas « place ».
           (SELECT count(*) FROM unnest(v_mots) m WHERE t.hay ~ ('\m' || m || '[sx]?\M'))::int AS mots_trouves,
           regexp_replace(replace(public.steeve_norm(coalesce(t.ville, '')), '-', ' '), '\s+', ' ', 'g') AS ville_n
      FROM tout t
     WHERE (v_pmin IS NULL OR t.pieces >= v_pmin)
       AND (v_pmax IS NULL OR t.pieces <= v_pmax)
       AND (v_budget IS NULL OR t.prix <= v_budget)
       AND (v_smin IS NULL OR t.surface >= v_smin)
  ), lieu AS (
    SELECT f.* FROM filtre f
     WHERE (cardinality(v_names) = 0 AND cardinality(v_npas) = 0)
        OR f.npa = ANY (v_npas)
        OR EXISTS (SELECT 1 FROM unnest(v_names) n WHERE f.ville_n = n OR f.ville_n LIKE n || ' %')
  ), classe AS (
    SELECT l.*, count(*) OVER () AS total
      FROM lieu l
     ORDER BY l.mots_trouves DESC, l.rang, l.publie_le DESC NULLS LAST
     LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'transaction', v_tx,
    'total', coalesce(max(total), 0),
    'mots_demandes', to_jsonb(v_mots),
    'offres', coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'ref', ref,
      'source', source,
      'titre', left(titre, 120),
      'pieces', pieces,
      'surface', surface,
      'prix', prix,
      'charges', charges,
      'ville', ville,
      'npa', npa,
      'disponibilite', left(disponibilite, 40),
      'atouts', left(public.steeve_redact(regexp_replace(coalesce(texte, ''), '[[:space:]]+', ' ', 'g')), 240),
      'mots_trouves', mots_trouves,
      'lien', lien,
      'photo', photo
    )) ORDER BY mots_trouves DESC, rang, publie_le DESC NULLS LAST), '[]'::jsonb)
  ) INTO v_result
  FROM classe;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_public_search(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_public_search(jsonb) TO service_role;

-- Un message peut maintenant demander une recherche (deux appels au modèle) : un message en cours compte
-- pour 0,004 USD dans les plafonds du site public (au lieu de 0,002).
CREATE OR REPLACE FUNCTION public.steeve_public_admit(p_session_hash text, p_ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  -- Un message en cours compte pour son coût maximal estimé (recherche comprise, consignes en cache).
  v_pending_cost constant numeric := 0.004;
  v_cfg jsonb;
  v_id uuid;
BEGIN
  IF coalesce(p_session_hash, '') = '' OR coalesce(p_ip_hash, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalide');
  END IF;
  SELECT jsonb_object_agg(key, value) INTO v_cfg FROM public.app_config WHERE key LIKE 'steeve_public_%' OR key = 'steeve_model';
  IF coalesce(v_cfg ->> 'steeve_public_enabled', 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  -- Une seule admission à la fois (les limites sont vérifiées sans course).
  PERFORM pg_advisory_xact_lock(hashtext('steeve_public_admit'));
  IF (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_day_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_day_usd', '')::numeric, 0.5)
     OR (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_month_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_month_usd', '')::numeric, 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  IF (SELECT count(*) FROM public.steeve_public_usage WHERE created_at > now() - interval '1 minute')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_minute_messages', '')::int, 30)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE session_hash = p_session_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_session_messages', '')::int, 20)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE ip_hash = p_ip_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_ip_messages', '')::int, 60) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'limite');
  END IF;
  INSERT INTO public.steeve_public_usage (session_hash, ip_hash) VALUES (p_session_hash, p_ip_hash) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id, 'model', coalesce(v_cfg ->> 'steeve_model', 'claude-haiku-5-5'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_public_admit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_public_admit(text, text) TO service_role;
