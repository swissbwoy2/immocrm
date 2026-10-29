-- 29.10.2026 : l'admin déclare qu'une candidature est déposée (« mets 3 candidatures déposées aujourd'hui ») :
-- sa déclaration vaut preuve. Candidature en attente de réponse, offre « candidature déposée », preuve inscrite dans
-- postulations_preparees, file de postulation close, tâches d'envoi / QR / contact annulées (plus rien à envoyer).
CREATE OR REPLACE FUNCTION public.admin_steeve_candidature_deposee(p_offre_id uuid, p_canal text DEFAULT NULL, p_le timestamptz DEFAULT NULL, p_detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_le timestamptz := coalesce(p_le, now());
  v_canal text := CASE WHEN p_canal IN ('email', 'flatfox', 'immobilier', 'naef_ecandidat') THEN p_canal ELSE 'autre' END;
  v_preuve text;
  v_cand uuid;
  v_pp uuid;
  n_act integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_le > now() + interval '1 hour' OR v_le < now() - interval '60 days' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Date de dépôt invalide (ni future, ni de plus de 60 jours).');
  END IF;
  SELECT x.id, x.client_id, x.adresse, x.statut INTO o FROM public.offres x WHERE x.id = p_offre_id;
  IF NOT FOUND OR o.client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable.');
  END IF;
  IF o.statut IN ('acceptee', 'refusee') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre déjà ' || o.statut || ' : rien changé.');
  END IF;
  v_preuve := left('Candidature déposée par l''équipe le ' || to_char(v_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY')
              || coalesce(' (' || nullif(trim(p_detail), '') || ')', ' (déclaration de l''admin)') || '.', 300);

  -- Candidature : en attente de la réponse de la régie (une candidature plus avancée n'est jamais reculée).
  SELECT id INTO v_cand FROM public.candidatures WHERE offre_id = o.id AND client_id = o.client_id ORDER BY created_at DESC LIMIT 1;
  IF v_cand IS NULL THEN
    INSERT INTO public.candidatures (client_id, offre_id, statut, date_depot, dossier_complet)
    VALUES (o.client_id, o.id, 'en_attente', v_le, true) RETURNING id INTO v_cand;
  ELSE
    UPDATE public.candidatures SET statut = 'en_attente', date_depot = coalesce(date_depot, v_le), dossier_complet = true, updated_at = now()
     WHERE id = v_cand AND statut IN ('demande_postulation', 'en_attente');
  END IF;

  UPDATE public.offres SET statut = 'candidature_deposee', needs_agent_action = false, updated_at = now(),
         commentaires = 'Dossier envoyé à la régie le ' || to_char(v_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ', réponse en attente.'
   WHERE id = o.id AND statut NOT IN ('candidature_deposee', 'acceptee');

  -- Preuve : un dossier préparé passe « envoyé », les autres en attente sont clos comme doublons.
  SELECT id INTO v_pp FROM public.postulations_preparees
   WHERE offre_id = o.id AND client_id = o.client_id AND statut IN ('prepare', 'a_valider', 'valide') ORDER BY created_at DESC LIMIT 1;
  IF v_pp IS NULL THEN
    INSERT INTO public.postulations_preparees (offre_id, client_id, candidature_id, canal, adresse_bien, source, statut, envoye_le, preuve_envoi, valide_par, valide_le)
    VALUES (o.id, o.client_id, v_cand, v_canal, o.adresse, 'admin', 'envoye', v_le, v_preuve, auth.uid(), now()) RETURNING id INTO v_pp;
  ELSE
    UPDATE public.postulations_preparees SET statut = 'envoye', envoye_le = v_le, preuve_envoi = v_preuve, motif_blocage = NULL,
           valide_par = auth.uid(), valide_le = now(), updated_at = now() WHERE id = v_pp;
  END IF;
  UPDATE public.postulations_preparees SET statut = 'refuse', motif_blocage = 'Doublon : dossier déposé par l''équipe.', updated_at = now()
   WHERE offre_id = o.id AND client_id = o.client_id AND id <> v_pp AND statut IN ('prepare', 'a_valider', 'valide');

  UPDATE public.postulation_jobs SET status = 'completed' WHERE offre_id = o.id AND client_id = o.client_id AND status IN ('queued', 'ready', 'blocked', 'failed');

  UPDATE public.steeve_actions SET statut = 'annule', updated_at = now(),
         motif = left('Dossier déposé par l''équipe le ' || to_char(v_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' : plus rien à envoyer.', 500),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'annule', 'par', 'admin'))
   WHERE offre_id = o.id AND client_id = o.client_id AND kind IN ('envoi_dossier', 'demande_qr', 'recherche_contact', 'relance_annonceur')
     AND statut NOT IN ('fait', 'annule');
  GET DIAGNOSTICS n_act = ROW_COUNT;

  INSERT INTO public.steeve_actions (kind, canal, source, client_id, offre_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'interne', 'admin', o.client_id, o.id, 'fait', 'humain', left('Candidature déclarée déposée par l''admin : ' || o.adresse, 300), now(),
          'postulations_preparees ' || v_pp, 'depot_declare:' || o.id || ':' || o.client_id, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'candidature', 'en_attente', 'offre', 'candidature_deposee',
    'depose_le', to_char(v_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'taches_closes', n_act);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_candidature_deposee(uuid, text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_candidature_deposee(uuid, text, timestamptz, text) TO authenticated, service_role;
