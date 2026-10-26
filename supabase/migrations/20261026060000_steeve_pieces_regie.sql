-- Pièces demandées par une régie (lot 8, partie 3) : un document déposé par le client réveille aussitôt Steeve
-- s'il attendait cette pièce pour la régie ; il la lit et l'envoie lui-même (opérateur, heures d'envoi 7 h – 20 h).
-- Règle de l'admin (26.10.2026) : l'attestation RC ménage n'est jamais bloquante, y compris pour marquer
-- « pièces complètes » une candidature à une annonce publique.
-- Additive et idempotente.

CREATE OR REPLACE FUNCTION public.steeve_document_depose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
BEGIN
  IF NEW.client_id IS NULL OR NEW.candidate_id IS NOT NULL
     OR coalesce(NEW.type_document, '') NOT IN ('piece_identite', 'permis_sejour', 'fiche_salaire', 'extrait_poursuites',
                                                 'contrat_travail', 'attestation_employeur', 'rc_menage') THEN
    RETURN NEW;
  END IF;
  FOR v_task IN
    UPDATE public.steeve_actions
       SET statut = 'a_faire', echeance = NULL, derniere_activite = now(), updated_at = now(),
           etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'document_depose', 'type', NEW.type_document))
     WHERE kind = 'envoi_piece_regie' AND client_id = NEW.client_id AND statut = 'en_attente_client'
    RETURNING id
  LOOP
    PERFORM public.steeve_reveiller(v_task.id);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Jamais bloquer le dépôt d'un document.
  RAISE WARNING 'steeve_document_depose: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_steeve_document_depose ON public.documents;
CREATE TRIGGER trg_steeve_document_depose AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.steeve_document_depose();

-- « Pièces justificatives complètes » d'une candidature à une annonce publique : RC ménage plus exigée.
CREATE OR REPLACE FUNCTION public.notify_candidature_pieces_completes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ok boolean; v_label text;
BEGIN
  IF NEW.candidature_id IS NULL THEN RETURN NEW; END IF;
  -- Ligne identité : permis de séjour (permis B/C/F/N) ou pièce d'identité (autres) ;
  -- les deux types restent acceptés, comme à l'écran. L'attestation RC ménage n'est jamais bloquante.
  SELECT
    (SELECT count(*) FROM documents WHERE candidature_id = NEW.candidature_id AND type_document = 'fiche_salaire') >= 3
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        (ARRAY['extrait_poursuites']),
        (ARRAY['piece_identite','permis_sejour']),
        (ARRAY['attestation_domicile']),
        (ARRAY['contrat_travail','attestation_employeur'])) AS req(types)
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
END $function$;
