-- 28.10.2026 (Marcela Jaquet) : Steeve ajoute lui-même une personne au dossier (garant, conjoint, colocataire…)
-- et connaît la situation « rentier » (revenus locatifs, rente) : contrat de travail et fiches de salaire ne sont
-- plus réclamés, un justificatif de revenus l'est.

CREATE OR REPLACE FUNCTION public.steeve_situation_personne(p_client_id uuid, p_candidate_id uuid, p_situation text, p_precision text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrat text := CASE p_situation WHEN 'salarie' THEN 'CDI' WHEN 'cdd' THEN 'CDD' WHEN 'interimaire' THEN 'Intérimaire'
                     WHEN 'independant' THEN 'Indépendant' WHEN 'sans_emploi' THEN 'Sans emploi' WHEN 'chomage' THEN 'Sans emploi'
                     WHEN 'etudiant' THEN 'Étudiant' WHEN 'retraite' THEN 'Retraité' WHEN 'au_foyer' THEN 'Sans emploi'
                     WHEN 'rentier' THEN 'Rentier (revenus locatifs ou rente)' END;
  v_source text := CASE p_situation WHEN 'chomage' THEN 'Chômage' WHEN 'retraite' THEN 'Retraite' WHEN 'independant' THEN 'Indépendant'
                     WHEN 'au_foyer' THEN 'Aucun' WHEN 'sans_emploi' THEN 'Autre' WHEN 'etudiant' THEN 'Autre'
                     WHEN 'rentier' THEN 'Revenus locatifs' ELSE 'Salaire' END;
  n integer;
BEGIN
  IF v_contrat IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Situation non reconnue (salarie, cdd, interimaire, independant, sans_emploi, chomage, etudiant, retraite, au_foyer, rentier).');
  END IF;
  IF p_candidate_id IS NULL THEN
    UPDATE public.clients SET type_contrat = v_contrat, source_revenus = v_source, updated_at = now() WHERE id = p_client_id;
  ELSE
    UPDATE public.client_candidates SET type_contrat = v_contrat, source_revenus = v_source, updated_at = now() WHERE id = p_candidate_id AND client_id = p_client_id;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Personne introuvable dans ce dossier.');
  END IF;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'client', p_client_id, 'fait', 'steeve',
          left('Situation notée : ' || v_contrat || coalesce(' — ' || p_precision, ''), 300), now(), coalesce('client_candidates ' || p_candidate_id, 'clients ' || p_client_id),
          'situation:' || coalesce(p_candidate_id, p_client_id) || ':' || extract(epoch FROM clock_timestamp())::text,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'type_contrat', v_contrat, 'source_revenus', v_source,
    'note', CASE WHEN v_contrat IN ('Sans emploi', 'Retraité', 'Étudiant') THEN 'Contrat de travail et fiches de salaire ne sont plus réclamés pour cette personne ; la régie peut demander un justificatif de revenus (chômage, rente, bourse) ou un garant.'
                 WHEN p_situation = 'rentier' THEN 'Contrat de travail et fiches de salaire ne sont plus réclamés ; un justificatif des revenus (baux, décompte de gérance, attestation de rente ou dernière taxation) l''est.'
                 ELSE NULL END);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_situation_personne(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_situation_personne(uuid, uuid, text, text) TO service_role;

-- Personne liée ajoutée par Steeve (le client la nomme : « mon fils Jérémie se porte garant ») ou par l'admin.
-- Même nom dans le dossier : la fiche existante est rendue (pas de doublon).
CREATE OR REPLACE FUNCTION public.steeve_ajouter_personne(p_client_id uuid, p_type text, p_prenom text, p_nom text, p_lien text DEFAULT NULL,
  p_date_naissance date DEFAULT NULL, p_nationalite text DEFAULT NULL, p_adresse text DEFAULT NULL, p_employeur text DEFAULT NULL, p_source text DEFAULT 'client')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prenom text := left(trim(coalesce(p_prenom, '')), 80);
  v_nom text := left(trim(coalesce(p_nom, '')), 80);
  v_id uuid;
  v_label text;
BEGIN
  IF p_type NOT IN ('garant', 'co_debiteur', 'colocataire', 'signataire_solidaire') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Rôle non reconnu (garant, co_debiteur, colocataire, signataire_solidaire).');
  END IF;
  IF length(v_prenom) < 2 OR length(v_nom) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Prénom et nom de la personne requis.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier introuvable.');
  END IF;
  SELECT id INTO v_id FROM public.client_candidates
   WHERE client_id = p_client_id AND lower(public.steeve_norm_adresse(prenom || ' ' || nom)) = lower(public.steeve_norm_adresse(v_prenom || ' ' || v_nom))
   LIMIT 1;
  v_label := v_prenom || ' ' || v_nom;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'id', v_id, 'personne', v_label);
  END IF;
  INSERT INTO public.client_candidates (client_id, type, prenom, nom, lien_avec_client, date_naissance, nationalite, adresse, employeur)
  VALUES (p_client_id, p_type, v_prenom, v_nom, nullif(left(trim(coalesce(p_lien, '')), 60), ''), p_date_naissance,
          nullif(left(trim(coalesce(p_nationalite, '')), 60), ''), nullif(left(trim(coalesce(p_adresse, '')), 200), ''), nullif(left(trim(coalesce(p_employeur, '')), 150), ''))
  RETURNING id INTO v_id;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', CASE WHEN p_source = 'admin' THEN 'admin' ELSE 'client' END, p_client_id, 'fait', 'steeve',
          left('Personne ajoutée au dossier : ' || v_label || ' (' || replace(p_type, '_', ' ') || coalesce(', ' || nullif(trim(p_lien), ''), '') || ')', 300),
          now(), 'client_candidates ' || v_id, 'personne_ajoutee:' || v_id, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'personne', v_label, 'role', p_type);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_ajouter_personne(uuid, text, text, text, text, date, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_ajouter_personne(uuid, text, text, text, text, date, text, text, text, text) TO service_role;

-- Copilote : même chose sur ordre de l'admin, avec la session de l'admin.
CREATE OR REPLACE FUNCTION public.admin_steeve_ajouter_personne(p_client_id uuid, p_type text, p_prenom text, p_nom text, p_lien text DEFAULT NULL,
  p_date_naissance date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_ajouter_personne(p_client_id, p_type, p_prenom, p_nom, p_lien, p_date_naissance, NULL, NULL, NULL, 'admin');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_ajouter_personne(uuid, text, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_ajouter_personne(uuid, text, text, text, text, date) TO authenticated, service_role;

-- Classement : nouveau type « justificatif_revenus » (baux, décomptes de loyers, rente, taxation).
CREATE OR REPLACE FUNCTION public.steeve_client_classer_document(
  p_client_id uuid, p_conversation_id uuid, p_message_id uuid, p_document_id uuid,
  p_path text, p_nom text, p_mime text, p_taille integer,
  p_type_document text, p_candidate_id uuid, p_date_emission date DEFAULT NULL, p_remarque text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_msg record;
  v_doc uuid;
  v_label text;
BEGIN
  IF p_type_document NOT IN ('piece_identite', 'permis_sejour', 'fiche_salaire', 'contrat_travail', 'attestation_employeur',
                             'extrait_poursuites', 'attestation_domicile', 'rc_menage', 'certificat_salaire', 'justificatif_revenus', 'formulaire_location', 'autre') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Type de document non reconnu.');
  END IF;
  SELECT user_id INTO v_user FROM public.clients WHERE id = p_client_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier introuvable.');
  END IF;
  IF p_candidate_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.client_candidates WHERE id = p_candidate_id AND client_id = p_client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Cette personne ne fait pas partie du dossier.');
  END IF;
  v_label := CASE p_type_document WHEN 'piece_identite' THEN 'Pièce d''identité' WHEN 'permis_sejour' THEN 'Permis de séjour'
    WHEN 'fiche_salaire' THEN 'Fiche de salaire' WHEN 'contrat_travail' THEN 'Contrat de travail' WHEN 'attestation_employeur' THEN 'Attestation employeur'
    WHEN 'extrait_poursuites' THEN 'Extrait des poursuites' WHEN 'attestation_domicile' THEN 'Attestation de domicile' WHEN 'rc_menage' THEN 'RC ménage'
    WHEN 'certificat_salaire' THEN 'Certificat de salaire' WHEN 'formulaire_location' THEN 'Demande de location' WHEN 'justificatif_revenus' THEN 'Justificatif de revenus' ELSE 'Document' END;

  IF p_document_id IS NOT NULL THEN
    UPDATE public.documents SET type_document = p_type_document, candidate_id = p_candidate_id,
           commentaire_admin = left(trim(both ' ' FROM coalesce(commentaire_admin, '') || ' Reclassé par Steeve le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || coalesce(' : ' || p_remarque, '') || '.'), 1000)
     WHERE id = p_document_id AND client_id = p_client_id
    RETURNING id INTO v_doc;
    IF v_doc IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Document introuvable dans ce dossier.');
    END IF;
  ELSE
    SELECT m.id, m.payload, m.attachment_url, m.sender_type INTO v_msg FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
     WHERE m.id = p_message_id AND m.conversation_id = p_conversation_id AND c.client_id = p_client_id::text;
    IF NOT FOUND OR v_msg.attachment_url IS NULL OR v_msg.sender_type <> 'client' THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Pièce jointe du client introuvable dans cette conversation.');
    END IF;
    IF (v_msg.payload ->> 'document_classe') IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'deja', true, 'document_id', v_msg.payload ->> 'document_classe');
    END IF;
    IF coalesce(p_path, '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Fichier non copié.');
    END IF;
    INSERT INTO public.documents (nom, type, taille, user_id, client_id, url, statut, type_document, candidate_id, commentaire_admin)
    VALUES (left(v_label || ' - ' || coalesce(nullif(p_nom, ''), 'fichier'), 200), coalesce(nullif(p_mime, ''), 'application/octet-stream'), p_taille,
            v_user, p_client_id, p_path, 'en attente', p_type_document, p_candidate_id,
            left('Envoyé dans la messagerie, classé par Steeve le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || coalesce(' : ' || p_remarque, '') || '.', 1000))
    RETURNING id INTO v_doc;
    UPDATE public.messages SET payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('document_classe', v_doc, 'document_type', p_type_document)
     WHERE id = p_message_id;
  END IF;

  IF p_type_document = 'extrait_poursuites' AND p_candidate_id IS NULL AND p_date_emission IS NOT NULL AND p_date_emission <= current_date THEN
    UPDATE public.clients SET extrait_poursuites_date_emission = p_date_emission
     WHERE id = p_client_id AND (extrait_poursuites_date_emission IS NULL OR extrait_poursuites_date_emission < p_date_emission);
  END IF;

  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'client', p_client_id, 'fait', 'steeve',
          left('Document classé : ' || v_label || coalesce(' (' || p_remarque || ')', ''), 300), now(), 'documents ' || v_doc,
          'classement:' || v_doc || ':' || p_type_document, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'document_id', v_doc, 'type', p_type_document, 'libelle', v_label);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_classer_document(uuid, uuid, uuid, uuid, text, text, text, integer, text, uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_classer_document(uuid, uuid, uuid, uuid, text, text, text, integer, text, uuid, date, text) TO service_role;
