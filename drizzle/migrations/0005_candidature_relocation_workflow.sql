ALTER TABLE public.candidatures_location
  ADD COLUMN IF NOT EXISTS date_depot timestamptz,
  ADD COLUMN IF NOT EXISTS date_documents_demandes timestamptz,
  ADD COLUMN IF NOT EXISTS date_decision timestamptz,
  ADD COLUMN IF NOT EXISTS candidat_confirme_at timestamptz,
  ADD COLUMN IF NOT EXISTS date_signature timestamptz,
  ADD COLUMN IF NOT EXISTS date_etat_lieux timestamptz,
  ADD COLUMN IF NOT EXISTS date_etat_lieux_effectue timestamptz,
  ADD COLUMN IF NOT EXISTS date_cles_remises timestamptz;

CREATE OR REPLACE FUNCTION public.guard_candidature_location_pipeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.pipeline_rpc', true) = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent') THEN
    RETURN NEW;
  END IF;
  IF NEW.statut IS DISTINCT FROM OLD.statut
     OR NEW.motif_refus IS DISTINCT FROM OLD.motif_refus
     OR NEW.note_agent IS DISTINCT FROM OLD.note_agent
     OR NEW.score_dossier IS DISTINCT FROM OLD.score_dossier
     OR NEW.date_depot IS DISTINCT FROM OLD.date_depot
     OR NEW.date_documents_demandes IS DISTINCT FROM OLD.date_documents_demandes
     OR NEW.date_decision IS DISTINCT FROM OLD.date_decision
     OR NEW.candidat_confirme_at IS DISTINCT FROM OLD.candidat_confirme_at
     OR NEW.date_signature IS DISTINCT FROM OLD.date_signature
     OR NEW.date_etat_lieux IS DISTINCT FROM OLD.date_etat_lieux
     OR NEW.date_etat_lieux_effectue IS DISTINCT FROM OLD.date_etat_lieux_effectue
     OR NEW.date_cles_remises IS DISTINCT FROM OLD.date_cles_remises THEN
    RAISE EXCEPTION 'Modification non autorisée de l''état de la candidature';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_candidature_location_pipeline ON public.candidatures_location;
CREATE TRIGGER trg_guard_candidature_location_pipeline BEFORE UPDATE ON public.candidatures_location
FOR EACH ROW EXECUTE FUNCTION public.guard_candidature_location_pipeline();

CREATE OR REPLACE FUNCTION public.candidat_deposer_candidature(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_date timestamptz; a record;
BEGIN
  SELECT * INTO r FROM candidatures_location WHERE id = _id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidature introuvable'; END IF;
  IF COALESCE(r.statut,'en_attente') <> 'en_attente' THEN RAISE EXCEPTION 'Candidature déjà déposée'; END IF;
  SELECT date_heure INTO v_date FROM annonce_creneaux WHERE id = r.creneau_id;
  v_date := COALESCE(v_date, r.date_visite);
  IF v_date IS NULL OR v_date >= now() THEN RAISE EXCEPTION 'La visite doit être passée pour déposer votre candidature'; END IF;
  PERFORM set_config('app.pipeline_rpc','on',true);
  UPDATE candidatures_location SET statut='candidature_deposee', date_depot=now(), updated_at=now() WHERE id=_id;
  PERFORM set_config('app.pipeline_rpc','off',true);
  SELECT titre, adresse, ville INTO a FROM annonces_publiques WHERE id = r.annonce_id;
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT ur.user_id, 'candidature_relocation', 'Nouvelle candidature déposée',
    COALESCE(r.prenom,'') || ' ' || COALESCE(r.nom,'') || ' — ' || COALESCE(a.titre, a.adresse, 'annonce'),
    '/admin/candidatures-relocation'
  FROM user_roles ur WHERE ur.role = 'admin';
END $$;

CREATE OR REPLACE FUNCTION public.candidat_confirmer_attribution(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM candidatures_location WHERE id=_id AND user_id=auth.uid() AND statut='retenu_bailleur') THEN
    RAISE EXCEPTION 'Confirmation impossible';
  END IF;
  PERFORM set_config('app.pipeline_rpc','on',true);
  UPDATE candidatures_location SET candidat_confirme_at=now(), updated_at=now() WHERE id=_id;
  PERFORM set_config('app.pipeline_rpc','off',true);
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT ur.user_id, 'candidature_relocation', 'Candidat confirme vouloir conclure', NULL, '/admin/candidatures-relocation'
  FROM user_roles ur WHERE ur.role = 'admin';
END $$;

CREATE OR REPLACE FUNCTION public.staff_update_candidature_location(_id uuid, _action text, _date timestamptz DEFAULT NULL, _motif text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_title text; v_msg text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT * INTO r FROM candidatures_location WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidature introuvable'; END IF;
  IF _action = 'documents_demandes' THEN
    UPDATE candidatures_location SET statut='documents_demandes', date_documents_demandes=now(), updated_at=now() WHERE id=_id;
    v_title := 'Documents demandés'; v_msg := 'Merci de téléverser vos justificatifs dans votre espace.';
  ELSIF _action = 'refusee' THEN
    UPDATE candidatures_location SET statut='refusee', motif_refus=_motif, date_decision=now(), updated_at=now() WHERE id=_id;
    v_title := 'Candidature non retenue'; v_msg := _motif;
  ELSIF _action = 'retenu_bailleur' THEN
    UPDATE candidatures_location SET statut='retenu_bailleur', date_decision=now(), updated_at=now() WHERE id=_id;
    v_title := 'Votre dossier est retenu'; v_msg := 'Confirmez dans votre espace que vous souhaitez conclure.';
  ELSIF _action = 'bail_signe' THEN
    UPDATE candidatures_location SET statut='bail_signe', date_signature=COALESCE(_date,now()), updated_at=now() WHERE id=_id;
    v_title := 'Bail signé'; v_msg := NULL;
  ELSIF _action = 'date_etat_lieux' THEN
    IF _date IS NULL THEN RAISE EXCEPTION 'Date requise'; END IF;
    UPDATE candidatures_location SET date_etat_lieux=_date, updated_at=now() WHERE id=_id;
    v_title := 'Date de l''état des lieux fixée'; v_msg := to_char(_date AT TIME ZONE 'Europe/Zurich','DD.MM.YYYY HH24:MI');
  ELSIF _action = 'etat_lieux_effectue' THEN
    UPDATE candidatures_location SET statut='etat_lieux_effectue', date_etat_lieux_effectue=now(), updated_at=now() WHERE id=_id;
    v_title := 'État des lieux effectué'; v_msg := NULL;
  ELSIF _action = 'cles_remises' THEN
    UPDATE candidatures_location SET statut='cles_remises', date_cles_remises=COALESCE(_date,now()), updated_at=now() WHERE id=_id;
    v_title := 'Remise des clés'; v_msg := 'Bienvenue dans votre nouveau logement !';
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;
  IF r.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (r.user_id, 'candidature_relocation', v_title, v_msg, '/candidat/candidatures');
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.candidat_deposer_candidature(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.candidat_confirmer_attribution(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.staff_update_candidature_location(uuid,text,timestamptz,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.candidat_deposer_candidature(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidat_confirmer_attribution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_candidature_location(uuid,text,timestamptz,text) TO authenticated;