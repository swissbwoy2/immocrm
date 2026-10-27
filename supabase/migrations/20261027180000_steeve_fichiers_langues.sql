-- Steeve, 27.10.2026 (demandes de l'admin après les conversations de Phoebe et de Shakhawan) :
-- zone jamais coupée, documents envoyés dans la discussion classés par Steeve, annonces trouvées par le client,
-- annonces « déjà vues », situation professionnelle d'une personne, état des demandes de visite, alerte unique.

-- 1. Critères : la zone n'est plus coupée à 300 caractères (Phoebe : « …Paudex, Cully, Villet »).
CREATE OR REPLACE FUNCTION public.steeve_client_criteres(p_client_id uuid, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  v_budget numeric := nullif(p_changes ->> 'budget_max', '')::numeric;
  v_pieces numeric := nullif(p_changes ->> 'pieces', '')::numeric;
  v_region text := nullif(trim(p_changes ->> 'region_recherche'), '');
  v_type text := nullif(trim(p_changes ->> 'type_bien'), '');
  v_souhaits text := nullif(trim(p_changes ->> 'souhaits_particuliers'), '');
  v_avant jsonb;
  v_apres jsonb;
BEGIN
  SELECT budget_max, pieces, region_recherche, type_bien, souhaits_particuliers INTO c FROM public.clients WHERE id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier introuvable.');
  END IF;
  IF v_budget IS NOT NULL AND (v_budget < 300 OR v_budget > 30000) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Budget hors des bornes (300 à 30 000 CHF par mois).');
  END IF;
  IF v_pieces IS NOT NULL AND (v_pieces < 1 OR v_pieces > 12 OR (v_pieces * 2) <> floor(v_pieces * 2)) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Nombre de pièces invalide (1 à 12, par demi-pièce).');
  END IF;
  IF v_type IS NOT NULL AND v_type NOT IN ('Appartement', 'Villa & maison', 'Maison', 'Studio', 'Chambre', 'Local commercial', 'Autre') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Type de bien non reconnu.');
  END IF;
  IF v_region IS NOT NULL AND length(v_region) > 4000 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Liste de communes trop longue (4000 caractères au plus) : regroupe par district ou canton (ex. « Lausanne et environs », « Lavaux »).');
  END IF;
  IF v_budget IS NULL AND v_pieces IS NULL AND v_region IS NULL AND v_type IS NULL AND v_souhaits IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucun changement précisé.');
  END IF;
  v_avant := jsonb_build_object('budget_max', c.budget_max, 'pieces', c.pieces, 'region_recherche', c.region_recherche, 'type_bien', c.type_bien, 'souhaits_particuliers', c.souhaits_particuliers);
  UPDATE public.clients
     SET budget_max = coalesce(v_budget, budget_max), pieces = coalesce(v_pieces, pieces),
         region_recherche = coalesce(v_region, region_recherche), type_bien = coalesce(v_type, type_bien),
         souhaits_particuliers = coalesce(left(v_souhaits, 2000), souhaits_particuliers), updated_at = now()
   WHERE id = p_client_id
  RETURNING jsonb_build_object('budget_max', budget_max, 'pieces', pieces, 'region_recherche', region_recherche, 'type_bien', type_bien, 'souhaits_particuliers', souhaits_particuliers)
  INTO v_apres;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, controles, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('changement_criteres', 'app', 'client', p_client_id, 'fait', 'steeve', jsonb_build_object('avant', v_avant, 'apres', v_apres),
          'Critères modifiés à la demande du client', now(), 'clients mis à jour',
          'criteres:' || p_client_id || ':' || extract(epoch FROM clock_timestamp())::text,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'avant', v_avant, 'apres', v_apres,
    'verifie', (v_region IS NULL OR v_apres ->> 'region_recherche' = v_region));
END;
$function$;

-- 2. Fichier envoyé dans la discussion (photo, capture, PDF) classé par Steeve dans « Mes documents », ou document du
--    dossier reclassé (ex. « Contrat BG.pdf » rangé en « Autre »). La copie du fichier est faite par la fonction Edge
--    (stockage) ; ici : contrôles d'appartenance, ligne documents, marque sur le message, journal.
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
                             'extrait_poursuites', 'attestation_domicile', 'rc_menage', 'certificat_salaire', 'formulaire_location', 'autre') THEN
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
    WHEN 'certificat_salaire' THEN 'Certificat de salaire' WHEN 'formulaire_location' THEN 'Demande de location' ELSE 'Document' END;

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

-- 3. Situation professionnelle d'une personne du dossier (client ou personne liée) : « licenciée », « sans emploi »,
--    « étudiant »… Les pièces qui ne s'appliquent plus (contrat, fiches de salaire) ne sont plus réclamées.
CREATE OR REPLACE FUNCTION public.steeve_situation_personne(p_client_id uuid, p_candidate_id uuid, p_situation text, p_precision text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrat text := CASE p_situation WHEN 'salarie' THEN 'CDI' WHEN 'cdd' THEN 'CDD' WHEN 'interimaire' THEN 'Intérimaire'
                     WHEN 'independant' THEN 'Indépendant' WHEN 'sans_emploi' THEN 'Sans emploi' WHEN 'chomage' THEN 'Sans emploi'
                     WHEN 'etudiant' THEN 'Étudiant' WHEN 'retraite' THEN 'Retraité' WHEN 'au_foyer' THEN 'Sans emploi' END;
  v_source text := CASE p_situation WHEN 'chomage' THEN 'Chômage' WHEN 'retraite' THEN 'Retraite' WHEN 'independant' THEN 'Indépendant'
                     WHEN 'au_foyer' THEN 'Aucun' WHEN 'sans_emploi' THEN 'Autre' WHEN 'etudiant' THEN 'Autre' ELSE 'Salaire' END;
  n integer;
BEGIN
  IF v_contrat IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Situation non reconnue (salarie, cdd, interimaire, independant, sans_emploi, chomage, etudiant, retraite, au_foyer).');
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
    'note', CASE WHEN v_contrat IN ('Sans emploi', 'Retraité', 'Étudiant') THEN 'Contrat de travail et fiches de salaire ne sont plus réclamés pour cette personne ; la régie peut demander un justificatif de revenus (chômage, rente, bourse) ou un garant.' ELSE NULL END);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_situation_personne(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_situation_personne(uuid, uuid, text, text) TO service_role;

-- Copilote : même chose sur ordre de l'admin (« Manal ne travaille pas »), avec la session de l'admin.
CREATE OR REPLACE FUNCTION public.admin_steeve_situation_personne(p_client_id uuid, p_candidate_id uuid, p_situation text, p_precision text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_situation_personne(p_client_id, p_candidate_id, p_situation, coalesce(p_precision, 'indiqué par l''admin'));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_situation_personne(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_situation_personne(uuid, uuid, text, text) TO authenticated, service_role;

-- Copilote : reclasser un document d'un dossier (type, personne).
CREATE OR REPLACE FUNCTION public.admin_steeve_classer_document(p_document_id uuid, p_type_document text, p_candidate_id uuid DEFAULT NULL, p_date_emission date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT client_id INTO v_client FROM public.documents WHERE id = p_document_id;
  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Document introuvable.');
  END IF;
  RETURN public.steeve_client_classer_document(v_client, NULL, NULL, p_document_id, NULL, NULL, NULL, NULL, p_type_document, p_candidate_id, p_date_emission, 'demandé par l''admin');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_classer_document(uuid, text, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_classer_document(uuid, text, uuid, date) TO authenticated, service_role;

-- 4. Annonces que le client a déjà vues ailleurs (ou déjà visitées) : plus jamais proposées par la recherche.
CREATE TABLE IF NOT EXISTS public.steeve_annonces_exclues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lien text,
  adresse text,
  motif text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS steeve_annonces_exclues_client_idx ON public.steeve_annonces_exclues (client_id);
ALTER TABLE public.steeve_annonces_exclues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.steeve_annonces_exclues FROM anon, authenticated;
GRANT ALL ON public.steeve_annonces_exclues TO service_role;

-- 5. Alerte « Dossier à vérifier avant envoi » : une seule fois par dossier et par motif (elle arrivait toutes les 5 min).
--    (La clé de l'alerte est posée par l'opérateur : voir operator.ts, alertAdmins avec la clé stable.)

-- 6. Fichiers reçus avant que Steeve sache les lire (ex. Shakhawan, IMG_9051 / IMG_9055 du 27.10) : Steeve reprend
--    une fois la dernière pièce jointe non classée d'une conversation (72 h), pour la regarder et la ranger.
CREATE OR REPLACE FUNCTION public.steeve_relire_pieces_jointes(p_limit integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_run uuid;
  n integer := 0;
BEGIN
  FOR v IN
    SELECT m.id, m.conversation_id, c.client_id
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id AND c.handled_by = 'steeve' AND c.conversation_type = 'client-agent'
     WHERE m.sender_type = 'client' AND m.attachment_url IS NOT NULL
       AND coalesce(m.attachment_type, '') <> 'audio'
       AND m.created_at > now() - interval '72 hours'
       AND coalesce(m.payload ->> 'kind', '') <> 'dossier_document'
       AND m.payload ->> 'document_classe' IS NULL AND m.payload ->> 'fichier_lu' IS NULL AND m.payload ->> 'relu_steeve' IS NULL
       AND NOT coalesce(m.masque_messagerie, false)
       AND public.steeve_client_servi(c.client_id::uuid)
       -- Dernier message du client : un message plus récent a déjà fait voir le fichier à Steeve.
       AND NOT EXISTS (SELECT 1 FROM public.messages x WHERE x.conversation_id = m.conversation_id AND x.sender_type = 'client' AND x.created_at > m.created_at)
     ORDER BY m.created_at
     LIMIT least(greatest(coalesce(p_limit, 5), 1), 20)
  LOOP
    UPDATE public.messages SET payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('relu_steeve', now()) WHERE id = v.id;
    INSERT INTO public.steeve_runs (conversation_id, client_id, trigger_message_id, kind, reason)
    VALUES (v.conversation_id, v.client_id, v.id, 'reply', 'relance')
    ON CONFLICT (trigger_message_id) DO UPDATE SET status = 'queued', reason = 'relance', started_at = NULL, finished_at = NULL
    RETURNING id INTO v_run;
    IF v_run IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-turn',
        headers := private.edge_service_headers(),
        body := jsonb_build_object('run_id', v_run),
        timeout_milliseconds := 60000);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_relire_pieces_jointes(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_relire_pieces_jointes(integer) TO service_role;
