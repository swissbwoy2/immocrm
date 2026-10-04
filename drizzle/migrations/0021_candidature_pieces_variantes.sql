CREATE OR REPLACE FUNCTION public.notify_candidature_pieces_completes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean; v_label text;
BEGIN
  IF NEW.candidature_id IS NULL THEN RETURN NEW; END IF;
  SELECT
    (SELECT count(*) FROM documents WHERE candidature_id = NEW.candidature_id AND type_document = 'fiche_salaire') >= 3
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        (ARRAY['extrait_poursuites']),
        (ARRAY['piece_identite','permis_sejour','permis_conduire']),
        (ARRAY['attestation_domicile']),
        (ARRAY['contrat_travail','attestation_employeur']),
        (ARRAY['rc_menage'])) AS req(types)
      WHERE NOT EXISTS (SELECT 1 FROM documents WHERE candidature_id = NEW.candidature_id AND type_document = ANY(req.types)))
  INTO v_ok;
  IF NOT v_ok THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM notifications WHERE type = 'candidature_pieces_completes'
             AND metadata->>'candidature_id' = NEW.candidature_id::text) THEN RETURN NEW; END IF;
  SELECT coalesce(nullif(concat_ws(', ', a.adresse, a.ville), ''), a.titre, 'Candidature')
    INTO v_label FROM candidatures_location c LEFT JOIN annonces_publiques a ON a.id = c.annonce_id
   WHERE c.id = NEW.candidature_id;
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT DISTINCT ur.user_id, 'candidature_pieces_completes', 'Pièces justificatives complètes',
         'Le candidat a fourni toutes ses pièces — ' || coalesce(v_label, ''),
         '/admin/candidatures-relocation/' || NEW.candidature_id,
         jsonb_build_object('candidature_id', NEW.candidature_id)
    FROM user_roles ur WHERE ur.role IN ('admin','agent');
  RETURN NEW;
END $$;