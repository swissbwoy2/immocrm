-- Ne rien laisser couler :
-- 1. alerte « crédit IA épuisé » (une fois par jour) : ligne app_config attendue par le moteur Steeve ;
-- 2. balayage des visites : 7 jours au lieu de 21 (on ne relance plus des intérêts vieux de 3 semaines) ;
-- 3. liste admin « Appels du jour » + enregistrement du résultat d'un appel ;
-- 4. rapport de santé quotidien à 8 h (sans IA) envoyé aux admins.
-- Aucune donnée supprimée, aucune règle RLS existante modifiée. (Déjà appliquée en base le 27.10.2026.)

-- 1. Marqueur de l'alerte crédit (notifyAdminsOnce met à jour une ligne existante)
INSERT INTO public.app_config (key, value)
VALUES ('steeve_credit_alerte_jour', '')
ON CONFLICT (key) DO NOTHING;

-- 2. Balayage des visites : fenêtre 7 jours
DO $$
DECLARE
  v_def text := pg_get_functiondef('public.steeve_balayage_visites(integer)'::regprocedure);
  v_new text;
BEGIN
  IF strpos(v_def, 'interval ''21 days''') > 0 THEN
    v_new := replace(v_def, 'interval ''21 days''', 'interval ''7 days''');
    IF (length(v_def) - length(replace(v_def, 'interval ''21 days''', ''))) <> length('interval ''21 days''') THEN
      RAISE EXCEPTION 'steeve_balayage_visites : occurrence inattendue de la fenêtre 21 jours';
    END IF;
    EXECUTE v_new;
  END IF;
END $$;

-- 3a. Rappels programmés par l'admin (« rappeler plus tard ») : table à part, sans toucher au cycle des tâches
CREATE TABLE IF NOT EXISTS public.steeve_appels_rappel (
  action_id uuid PRIMARY KEY REFERENCES public.steeve_actions(id) ON DELETE CASCADE,
  rappeler_le timestamptz NOT NULL,
  note text,
  par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.steeve_appels_rappel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin lit les rappels" ON public.steeve_appels_rappel;
CREATE POLICY "admin lit les rappels" ON public.steeve_appels_rappel
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Téléphone suisse repéré dans un texte (premier trouvé)
CREATE OR REPLACE FUNCTION public.steeve_extraire_telephone(p_texte text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT substring(coalesce(p_texte, '') FROM '(\+41[ .]?\(?0?\)?[1-9][0-9][ .]?[0-9]{3}[ .]?[0-9]{2}[ .]?[0-9]{2}|0[1-9][0-9][ .]?[0-9]{3}[ .]?[0-9]{2}[ .]?[0-9]{2})');
$$;

-- 3b. Liste « Appels du jour » (admin uniquement), la plus ancienne d'abord
CREATE OR REPLACE FUNCTION public.admin_appels_du_jour(p_limite integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  WITH mails AS (
    SELECT a.id, 'mail'::text AS type, a.kind, a.statut, a.created_at, a.offre_id,
           coalesce(a.client_id, o.client_id) AS client_id, a.objet, a.motif,
           public.steeve_extraire_telephone(coalesce(a.motif, '') || ' ' || left(coalesce(a.corps, ''), 6000)) AS telephone,
           a.destinataire AS expediteur
    FROM public.steeve_actions a
    LEFT JOIN public.offres o ON o.id = a.offre_id
    WHERE a.kind = 'lecture_mail' AND a.statut = 'a_valider'
  ),
  contacts AS (
    SELECT DISTINCT ON (a.offre_id)
           a.id, 'contact'::text AS type, a.kind, a.statut, a.created_at, a.offre_id,
           coalesce(a.client_id, o.client_id) AS client_id, a.objet, a.motif,
           public.steeve_extraire_telephone(coalesce(o.contact_annonceur, '') || ' ' || coalesce(o.contact_gerance, '') || ' ' || coalesce(o.contact_visite, '') || ' ' || coalesce(a.motif, '')) AS telephone,
           NULL::text AS expediteur
    FROM public.steeve_actions a
    JOIN public.offres o ON o.id = a.offre_id
    WHERE a.created_at > now() - interval '30 days'
      AND (
        (a.kind IN ('demande_visite', 'demande_qr') AND a.statut = 'bloque' AND a.motif ILIKE 'Aucune adresse%')
        OR (a.kind = 'recherche_contact' AND (
              a.statut IN ('bloque', 'bloque_acces')
              OR (a.statut = 'a_faire' AND a.created_at < now() - interval '24 hours')))
      )
      -- Annonce Flatfox dont le chat est en cours ou a abouti : rien à appeler
      AND NOT EXISTS (
        SELECT 1 FROM public.steeve_actions f
        WHERE f.offre_id = a.offre_id AND f.canal = 'flatfox' AND f.kind IN ('demande_visite', 'demande_qr')
          AND f.statut NOT IN ('bloque', 'bloque_acces', 'echec', 'annule')
      )
      -- Déjà traité par un e-mail à valider de la même offre : une seule ligne
      AND NOT EXISTS (
        SELECT 1 FROM public.steeve_actions m
        WHERE m.offre_id = a.offre_id AND m.kind = 'lecture_mail' AND m.statut = 'a_valider'
      )
    ORDER BY a.offre_id, a.created_at DESC
  ),
  tout AS (
    SELECT * FROM mails
    UNION ALL
    SELECT * FROM contacts
  ),
  visibles AS (
    SELECT t.* FROM tout t
    LEFT JOIN public.steeve_appels_rappel r ON r.action_id = t.id
    WHERE r.action_id IS NULL OR r.rappeler_le <= now()
  ),
  rappels AS (
    SELECT count(*) AS n FROM tout t JOIN public.steeve_appels_rappel r ON r.action_id = t.id WHERE r.rappeler_le > now()
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM visibles),
    'mails', (SELECT count(*) FROM visibles WHERE type = 'mail'),
    'contacts', (SELECT count(*) FROM visibles WHERE type = 'contact'),
    'reportes', (SELECT n FROM rappels),
    'liste', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'created_at')::timestamptz)
      FROM (
        SELECT jsonb_build_object(
          'id', v.id, 'type', v.type, 'kind', v.kind, 'statut', v.statut, 'created_at', v.created_at,
          'age_heures', round(extract(epoch FROM (now() - v.created_at)) / 3600),
          'offre_id', v.offre_id, 'client_id', v.client_id, 'objet', v.objet, 'motif', left(v.motif, 600),
          'telephone', v.telephone, 'expediteur', v.expediteur,
          'adresse', o.adresse, 'lien_annonce', o.lien_annonce, 'contact', left(coalesce(o.contact_annonceur, o.contact_gerance), 300),
          'offre_statut', o.statut,
          'client_nom', nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''),
          'client_telephone', p.telephone,
          'rappel_note', r.note,
          'agence', ag.nom_agence, 'agence_telephone', ag.telephone, 'agence_email', ag.email
        ) AS x
        FROM visibles v
        LEFT JOIN public.offres o ON o.id = v.offre_id
        LEFT JOIN public.clients c ON c.id = v.client_id
        LEFT JOIN public.profiles p ON p.id = c.user_id
        LEFT JOIN public.steeve_appels_rappel r ON r.action_id = v.id
        -- Régie reconnue dans le carnet des agences (nom sans « SA », « Sàrl »…)
        LEFT JOIN LATERAL (
          SELECT g.nom_agence, g.telephone, g.email
          FROM public.agences_immobilieres g
          CROSS JOIN LATERAL (SELECT trim(regexp_replace(lower(g.nom_agence), '[ ,]+(sa|s\.a\.|sàrl|sarl|ag|gmbh)\.?$', '')) AS coeur) k
          WHERE length(k.coeur) >= 4
            AND strpos(lower(coalesce(o.contact_annonceur, '') || ' ' || coalesce(o.contact_gerance, '') || ' ' || coalesce(v.objet, '') || ' ' || coalesce(v.motif, '') || ' ' || coalesce(v.expediteur, '')), k.coeur) > 0
          ORDER BY length(k.coeur) DESC
          LIMIT 1
        ) ag ON true
        ORDER BY v.created_at
        LIMIT greatest(1, least(coalesce(p_limite, 100), 300))
      ) s
    ), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_appels_du_jour(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_appels_du_jour(integer) TO authenticated;

-- 3c. Résultat d'un appel
--   visite_fixee : la visite est inscrite (calendrier + client prévenu) puis les tâches ouvertes de l'offre sont closes ;
--   refuse       : bien plus disponible / refus : tâches ouvertes de l'offre annulées ;
--   rappeler     : la ligne disparaît jusqu'à la date choisie (demain 9 h par défaut) ;
--   classer      : rien à faire, tâche close.
CREATE OR REPLACE FUNCTION public.admin_appel_resultat(
  p_action_id uuid,
  p_resultat text,
  p_note text DEFAULT NULL,
  p_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.steeve_actions%ROWTYPE;
  v_client uuid;
  v_evt jsonb;
  v_visite jsonb;
  v_statut text;
  v_n integer := 0;
  v_quand timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_resultat NOT IN ('visite_fixee', 'refuse', 'rappeler', 'classer') THEN
    RAISE EXCEPTION 'Résultat inconnu' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v FROM public.steeve_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tâche introuvable' USING ERRCODE = 'P0002';
  END IF;

  v_evt := jsonb_build_object('le', now(), 'evt', 'appel_' || p_resultat, 'par', 'admin', 'admin', auth.uid(), 'note', left(p_note, 300));

  IF p_resultat = 'rappeler' THEN
    v_quand := coalesce(p_date, date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich' + interval '1 day 9 hours');
    INSERT INTO public.steeve_appels_rappel (action_id, rappeler_le, note, par)
    VALUES (p_action_id, v_quand, left(p_note, 500), auth.uid())
    ON CONFLICT (action_id) DO UPDATE SET rappeler_le = excluded.rappeler_le, note = excluded.note, par = excluded.par, updated_at = now();
    UPDATE public.steeve_actions SET etapes = public.steeve_tache_evt(etapes, v_evt), derniere_activite = now(), updated_at = now()
    WHERE id = p_action_id;
    RETURN jsonb_build_object('ok', true, 'rappeler_le', v_quand);
  END IF;

  IF p_resultat = 'visite_fixee' THEN
    v_client := coalesce(v.client_id, (SELECT client_id FROM public.offres WHERE id = v.offre_id));
    IF v.offre_id IS NULL OR v_client IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Pas d''offre rattachée : fixe la visite depuis la fiche du client.');
    END IF;
    IF p_date IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Date et heure de la visite manquantes.');
    END IF;
    v_visite := public.steeve_apply_visite(v.offre_id, v_client, p_date, NULL, 'appel_admin');
    IF coalesce((v_visite->>'ok')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('ok', false, 'motif', coalesce(v_visite->>'motif', 'Visite non enregistrée'));
    END IF;
    -- Le client est prévenu dans l'application (notification + push)
    IF coalesce((v_visite->>'message_requis')::boolean, false) THEN
      PERFORM public.create_notification(
        c.user_id, 'visite_planifiee', 'Visite fixée',
        'Votre visite au ' || coalesce(v_visite->>'adresse', 'bien proposé') || ' est fixée le ' || coalesce(v_visite->>'quand', '') || '. Retrouvez-la dans vos visites.',
        '/client/visites', jsonb_build_object('offre_id', v.offre_id, 'visite_id', v_visite->>'visite_id', 'source', 'appel_admin'))
      FROM public.clients c WHERE c.id = v_client AND c.user_id IS NOT NULL;
    END IF;
  END IF;

  v_statut := CASE WHEN p_resultat = 'refuse' THEN 'annule' ELSE 'fait' END;

  -- La tâche appelée
  UPDATE public.steeve_actions
  SET statut = v_statut,
      note = left(concat_ws(' · ', nullif(note, ''), 'Appel admin : ' || p_resultat || coalesce(' — ' || nullif(p_note, ''), '')), 2000),
      cancelled_by = CASE WHEN v_statut = 'annule' THEN auth.uid() ELSE cancelled_by END,
      executed_at = CASE WHEN v_statut = 'fait' THEN now() ELSE executed_at END,
      verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
      etapes = public.steeve_tache_evt(etapes, v_evt),
      derniere_activite = now(), updated_at = now()
  WHERE id = p_action_id;
  DELETE FROM public.steeve_appels_rappel WHERE action_id = p_action_id;

  -- Les autres tâches « à appeler » de la même offre (jamais celles en cours chez une routine)
  IF v.offre_id IS NOT NULL AND p_resultat IN ('visite_fixee', 'refuse') THEN
    WITH maj AS (
      UPDATE public.steeve_actions a
      SET statut = v_statut,
          note = left(concat_ws(' · ', nullif(a.note, ''), 'Clos par appel admin : ' || p_resultat), 2000),
          cancelled_by = CASE WHEN v_statut = 'annule' THEN auth.uid() ELSE a.cancelled_by END,
          etapes = public.steeve_tache_evt(a.etapes, v_evt),
          derniere_activite = now(), updated_at = now()
      WHERE a.offre_id = v.offre_id AND a.id <> p_action_id
        AND (
          (a.kind = 'lecture_mail' AND a.statut = 'a_valider')
          OR (a.kind = 'recherche_contact' AND a.statut IN ('a_faire', 'bloque', 'bloque_acces'))
          OR (a.kind IN ('demande_visite', 'demande_qr') AND a.statut = 'bloque' AND a.motif ILIKE 'Aucune adresse%')
        )
      RETURNING a.id
    )
    SELECT count(*) INTO v_n FROM maj;
  END IF;

  RETURN jsonb_build_object('ok', true, 'statut', v_statut, 'autres_closes', v_n, 'visite', v_visite);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_appel_resultat(uuid, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_appel_resultat(uuid, text, text, timestamptz) TO authenticated;

-- 4. Rapport de santé quotidien (8 h, heure de Zurich), sans IA
CREATE OR REPLACE FUNCTION public.steeve_rapport_sante(p_forcer boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mails integer; v_mail_age numeric;
  v_contacts integer; v_contact_age numeric;
  v_a_verifier integer;
  v_echecs integer; v_credit integer;
  v_visites integer;
  v_portails text;
  v_msg text;
  v_titre text;
  v_admin record;
  v_jour text := to_char(now() AT TIME ZONE 'Europe/Zurich', 'YYYY-MM-DD');
BEGIN
  -- Appelée par cron à 6 h et 7 h UTC : ne part qu'à 8 h à Zurich (été comme hiver), une fois par jour
  IF NOT p_forcer THEN
    IF extract(hour FROM now() AT TIME ZONE 'Europe/Zurich') <> 8 THEN
      RETURN jsonb_build_object('envoye', false, 'motif', 'hors horaire');
    END IF;
    IF EXISTS (SELECT 1 FROM public.app_config WHERE key = 'steeve_rapport_sante_jour' AND value = v_jour) THEN
      RETURN jsonb_build_object('envoye', false, 'motif', 'déjà envoyé');
    END IF;
  END IF;

  SELECT count(*), round(extract(epoch FROM now() - min(created_at)) / 3600)
    INTO v_mails, v_mail_age
  FROM public.steeve_actions WHERE kind = 'lecture_mail' AND statut = 'a_valider';

  -- Même périmètre que la liste « Appels du jour » (une ligne par offre)
  SELECT count(DISTINCT a.offre_id), round(extract(epoch FROM now() - min(a.created_at)) / 3600)
    INTO v_contacts, v_contact_age
  FROM public.steeve_actions a
  WHERE a.offre_id IS NOT NULL AND a.created_at > now() - interval '30 days'
    AND (
      (a.kind IN ('demande_visite', 'demande_qr') AND a.statut = 'bloque' AND a.motif ILIKE 'Aucune adresse%')
      OR (a.kind = 'recherche_contact' AND (a.statut IN ('bloque', 'bloque_acces') OR (a.statut = 'a_faire' AND a.created_at < now() - interval '24 hours')))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.steeve_actions f
      WHERE f.offre_id = a.offre_id AND f.canal = 'flatfox' AND f.kind IN ('demande_visite', 'demande_qr')
        AND f.statut NOT IN ('bloque', 'bloque_acces', 'echec', 'annule'))
    AND NOT EXISTS (
      SELECT 1 FROM public.steeve_actions m
      WHERE m.offre_id = a.offre_id AND m.kind = 'lecture_mail' AND m.statut = 'a_valider');

  SELECT string_agg(src || ' ' || n, ', ' ORDER BY n DESC) INTO v_portails
  FROM (
    SELECT CASE
             WHEN o.lien_annonce ILIKE '%homegate%' THEN 'Homegate'
             WHEN o.lien_annonce ILIKE '%flatfox%' THEN 'Flatfox'
             WHEN o.lien_annonce ILIKE '%immobilier.ch%' THEN 'immobilier.ch'
             ELSE 'autres'
           END AS src, count(*) AS n
    FROM public.steeve_actions a
    LEFT JOIN public.offres o ON o.id = a.offre_id
    WHERE a.kind = 'recherche_contact' AND a.statut = 'a_faire'
    GROUP BY 1
  ) s;

  SELECT count(*) INTO v_a_verifier FROM public.steeve_actions WHERE statut = 'resultat_inconnu';

  SELECT count(*) FILTER (WHERE status = 'failed'),
         count(*) FILTER (WHERE status = 'failed' AND coalesce(error, '') ~* '(credit balance|billing|insufficient)')
    INTO v_echecs, v_credit
  FROM public.steeve_runs WHERE created_at > now() - interval '24 hours';

  SELECT count(*) INTO v_visites FROM public.steeve_actions
  WHERE executed_at > now() - interval '24 hours' AND statut = 'fait' AND kind IN ('lecture_mail', 'demande_visite');

  v_msg := concat_ws(E'\n',
    'À appeler / valider : ' || v_mails || ' e-mail(s) de régie' || CASE WHEN v_mails > 0 THEN ' (le plus ancien : ' || v_mail_age || ' h)' ELSE '' END
      || ', ' || v_contacts || ' contact(s) introuvable(s)' || CASE WHEN v_contacts > 0 THEN ' (le plus ancien : ' || v_contact_age || ' h)' ELSE '' END || '.',
    'File des routines portails : ' || coalesce(v_portails, 'vide') || '.',
    CASE WHEN v_a_verifier > 0 THEN 'Envois à vérifier : ' || v_a_verifier || '.' END,
    'Steeve, 24 h : ' || v_echecs || ' échec(s)' || CASE WHEN v_credit > 0 THEN ' dont ' || v_credit || ' faute de crédit IA' ELSE '' END
      || ', ' || v_visites || ' réponse(s) de régie traitée(s).'
  );
  v_titre := CASE
    WHEN v_credit > 0 THEN 'Santé du jour : crédit IA épuisé'
    WHEN v_mails + v_contacts > 0 THEN 'Santé du jour : ' || (v_mails + v_contacts) || ' appel(s) en attente'
    ELSE 'Santé du jour : tout est à jour'
  END;

  FOR v_admin IN SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM public.create_notification(v_admin.user_id, 'steeve_sante', v_titre, v_msg, '/admin/steeve?section=appels',
      jsonb_build_object('mails', v_mails, 'contacts', v_contacts, 'echecs', v_echecs, 'credit', v_credit));
  END LOOP;

  INSERT INTO public.app_config (key, value) VALUES ('steeve_rapport_sante_jour', v_jour)
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();

  RETURN jsonb_build_object('envoye', true, 'titre', v_titre, 'message', v_msg);
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_rapport_sante(boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('steeve-rapport-sante-8h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'steeve-rapport-sante-8h');
  PERFORM cron.schedule('steeve-rapport-sante-8h', '0 6,7 * * *', 'SELECT public.steeve_rapport_sante(false);');
END $$;
