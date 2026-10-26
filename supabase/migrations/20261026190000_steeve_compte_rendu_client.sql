-- Steeve se présente aux clients (location et achat) et leur envoie le point complet de leur dossier (demande de l'admin, 26.10.2026).
-- steeve_presentation_client(client) : message de présentation (ce que Steeve fait pour le client).
-- steeve_compte_rendu_client(client) : compte rendu calculé à partir de la base, sans modèle, rien d'inventé :
--   recherche et mandat, offres (dernière, en attente de réponse, intéressé), visites (à venir, à décider),
--   candidatures (état), pièces du dossier par personne (mêmes listes que « Mes documents » et le contrôle de
--   postulation ; RC ménage jamais exigée), demandes de l'agent, prochaines étapes.
-- steeve_envoyer_point_clients(cle, client) : publie les deux messages dans la conversation de chaque client actif
--   (une seule fois par clé), entre 8h et 20h ; réservé au serveur (service_role).
-- Additive et idempotente.

CREATE OR REPLACE FUNCTION public.steeve_fmt_chf(p numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p IS NULL THEN NULL ELSE replace(to_char(round(p), 'FM999G999G990'), ',', '’') || ' CHF' END;
$$;

CREATE OR REPLACE FUNCTION public.steeve_fmt_pieces(p numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p IS NULL THEN NULL WHEN p = trunc(p) THEN trunc(p)::text ELSE replace(trim(to_char(p, 'FM990.0')), '.', ',') END;
$$;

CREATE OR REPLACE FUNCTION public.steeve_presentation_client(p_client_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN coalesce(c.journey_type, c.type_recherche, '') IN ('purchase_search', 'achat', 'Acheter') THEN
      'Bonjour ' || coalesce(nullif(trim(p.prenom), ''), '') || E', je suis Steeve, l''assistant de Logisorama et d''Immo-Rama. Je travaille avec ton courtier sur ton projet d''achat, 7 jours sur 7, et je te réponds ici, dans ta messagerie, à toute heure.\n\n'
      || E'Ce que je peux faire pour toi :\n'
      || E'- te dire où en est ton projet : biens proposés, visites, pièces de ton dossier de financement, mandat ;\n'
      || E'- noter ta réponse à un bien proposé (intéressé ou pas intéressé) ;\n'
      || E'- demander une visite au vendeur ou à son courtier, avec tes disponibilités ;\n'
      || E'- modifier tes critères (budget, nombre de pièces, régions, type de bien, souhaits) : ton courtier en tient compte tout de suite, y compris pour les biens hors marché de notre réseau ;\n'
      || E'- te dire quelles pièces manquent pour l''appel d''offres bancaire et le suivre avec toi ;\n'
      || E'- te passer ton courtier quand il faut une personne (offre d''achat, négociation, financement, signature chez le notaire, ou simplement si tu le demandes).\n\n'
      || E'Écris-moi simplement, comme à une personne. Par exemple : « Où en est mon dossier de financement ? », « Je veux visiter la villa de Pully », « Ajoute Morges à mes régions ».\n\n'
      || 'Je t''envoie juste après le point complet sur ton projet.'
    ELSE
      'Bonjour ' || coalesce(nullif(trim(p.prenom), ''), '') || E', je suis Steeve, l''assistant de Logisorama et d''Immo-Rama. Je travaille avec ton agent sur ta recherche, 7 jours sur 7, et je te réponds ici, dans ta messagerie, à toute heure.\n\n'
      || E'Ce que je peux faire pour toi :\n'
      || E'- te dire où en est ton dossier : offres reçues, visites, candidatures, pièces déposées ou manquantes, mandat ;\n'
      || E'- noter ta réponse à une offre (intéressé ou pas intéressé) ;\n'
      || E'- demander une visite à l''annonceur, avec tes disponibilités ;\n'
      || E'- lancer ta candidature après une visite : je contrôle ton dossier complet avant qu''il parte à la régie ;\n'
      || E'- modifier tes critères (budget, nombre de pièces, régions, souhaits) et lancer tout de suite une nouvelle recherche d''offres ;\n'
      || E'- suivre les réponses des régies (visite fixée, pièce demandée, réponse à ta candidature) et te tenir au courant ;\n'
      || E'- te passer ton agent quand il faut une personne (signature, bail, paiement, ou simplement si tu le demandes).\n\n'
      || E'Écris-moi simplement, comme à une personne. Par exemple : « Où en est ma candidature ? », « Je veux visiter l''appartement de la rue du Lac », « Ajoute Morges à mes régions ».\n\n'
      || 'Je t''envoie juste après le point complet sur ton dossier.'
    END
    FROM public.clients c LEFT JOIN public.profiles p ON p.id = c.user_id
   WHERE c.id = p_client_id;
$$;

CREATE OR REPLACE FUNCTION public.steeve_compte_rendu_client(p_client_id uuid, p_now timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_prenom text;
  t text := '';
  v_line text;
  r record;
  v_n int;
  v_n7 int;
  v_attente int;
  v_interesse int;
  v_manque text[] := '{}';
  v_next text[] := '{}';
  v_jour text[] := ARRAY['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  v_achat boolean;
  v_prix numeric;
  v_fp numeric;
BEGIN
  SELECT cl.*, p.prenom INTO c FROM public.clients cl LEFT JOIN public.profiles p ON p.id = cl.user_id WHERE cl.id = p_client_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_prenom := coalesce(nullif(trim(c.prenom), ''), '');
  v_achat := coalesce(c.journey_type, c.type_recherche, '') IN ('purchase_search', 'achat', 'Acheter');
  IF v_achat THEN
    -- Acheteur : prix visé et fonds propres du profil de financement (source de vérité du parcours achat),
    -- repli sur la fiche client.
    SELECT nullif(f.prix_cible, 0),
           nullif(coalesce(f.fonds_propres_cash, 0) + coalesce(f.fonds_propres_epargne, 0) + coalesce(f.fonds_propres_3a, 0)
                  + coalesce(f.fonds_propres_libre_passage, 0) + coalesce(f.placements, 0) + coalesce(f.donation_avance_hoirie, 0)
                  + coalesce(f.fonds_propres_lpp, 0) + coalesce(f.montant_epl_disponible, 0), 0)
      INTO v_prix, v_fp
      FROM public.purchase_financing_profiles f JOIN public.purchase_projects pp ON pp.id = f.project_id
     WHERE pp.client_id = p_client_id
     ORDER BY f.updated_at DESC NULLS LAST LIMIT 1;
    v_prix := coalesce(v_prix, CASE WHEN c.budget_max >= 50000 THEN c.budget_max END);
    v_fp := coalesce(v_fp, CASE WHEN c.apport_personnel::text ~ '^[0-9.]+$' THEN nullif(c.apport_personnel::numeric, 0) END);
  END IF;

  t := 'Voici le point complet sur ton ' || CASE WHEN v_achat THEN 'projet d''achat' ELSE 'dossier' END || ' au ' || to_char(p_now AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ', ' || v_prenom || E'.\n\n';

  -- Recherche et mandat
  t := t || E'Ta recherche\n';
  v_line := '- ' || CASE WHEN v_achat THEN 'Achat : ' ELSE '' END || coalesce(upper(left(nullif(trim(c.type_bien), ''), 1)) || substr(trim(c.type_bien), 2), 'Logement')
         || CASE WHEN c.pieces IS NOT NULL THEN ', dès ' || public.steeve_fmt_pieces(c.pieces) || CASE WHEN c.pieces > 1 THEN ' pièces' ELSE ' pièce' END ELSE '' END
         || CASE WHEN v_achat THEN coalesce(', prix visé ' || public.steeve_fmt_chf(v_prix), '') || coalesce(', fonds propres ' || public.steeve_fmt_chf(v_fp), '')
                 WHEN c.budget_max IS NULL THEN ''
                 ELSE ', jusqu''à ' || public.steeve_fmt_chf(c.budget_max) || ' par mois' END
         || CASE WHEN nullif(trim(c.region_recherche), '') IS NOT NULL THEN ', régions : ' || left(trim(c.region_recherche), 200) ELSE '' END || '.';
  t := t || v_line || E'\n';
  IF c.mandat_date_signature IS NOT NULL THEN
    t := t || '- Mandat signé le ' || to_char(c.mandat_date_signature AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY')
           || CASE WHEN c.mandate_official_end_date IS NOT NULL THEN ', valable jusqu''au ' || to_char(c.mandate_official_end_date, 'DD.MM.YYYY') ELSE '' END
           || E'.\n';
  END IF;
  t := t || CASE WHEN v_achat THEN E'- Pour changer un critère, écris-le-moi : je le mets à jour tout de suite pour ton courtier.\n\n'
              ELSE E'- Pour changer un critère, écris-le-moi : je le mets à jour tout de suite et je relance la recherche.\n\n' END;

  -- Offres
  SELECT count(*) FILTER (WHERE o.date_envoi IS NOT NULL), count(*) FILTER (WHERE o.date_envoi > p_now - interval '7 days')
    INTO v_n, v_n7 FROM public.offres o WHERE o.client_id = p_client_id AND coalesce(o.statut, '') NOT IN ('doublon', 'tiktok');
  t := t || CASE WHEN v_achat THEN E'Les biens proposés\n' ELSE E'Tes offres\n' END;
  IF v_n = 0 THEN
    t := t || CASE WHEN v_achat THEN E'- Aucun bien proposé pour l''instant : ton courtier cherche avec tes critères, sur le marché et hors marché.\n'
                   ELSE E'- Aucune offre envoyée pour l''instant : je lance les recherches avec tes critères.\n' END;
  ELSE
    t := t || '- ' || v_n || CASE WHEN v_achat THEN ' bien' ELSE ' offre' END || CASE WHEN v_n > 1 THEN 's' ELSE '' END
           || CASE WHEN v_achat THEN ' proposé' ELSE ' reçue' END || CASE WHEN v_n > 1 THEN 's' ELSE '' END
           || ' depuis le début, dont ' || v_n7 || E' ces 7 derniers jours.\n';
    SELECT o.adresse, o.prix, o.date_envoi INTO r FROM public.offres o
     WHERE o.client_id = p_client_id AND o.date_envoi IS NOT NULL AND coalesce(o.statut, '') NOT IN ('doublon', 'tiktok')
     ORDER BY o.date_envoi DESC LIMIT 1;
    IF FOUND THEN
      t := t || '- La dernière : ' || coalesce(r.adresse, 'adresse à confirmer')
             || CASE WHEN r.prix IS NOT NULL THEN ', ' || public.steeve_fmt_chf(r.prix) ELSE '' END
             || ', envoyée le ' || to_char(r.date_envoi AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || E'.\n';
    END IF;
  END IF;
  SELECT count(*) INTO v_attente FROM public.offres o
   WHERE o.client_id = p_client_id AND o.statut = 'envoyee' AND o.date_envoi > p_now - interval '30 days';
  IF v_attente > 0 THEN
    SELECT string_agg(x.adresse, ' ; ' ORDER BY x.d DESC) INTO v_line FROM (
      SELECT coalesce(o.adresse, 'adresse à confirmer') AS adresse, max(o.date_envoi) AS d FROM public.offres o
       WHERE o.client_id = p_client_id AND o.statut = 'envoyee' AND o.date_envoi > p_now - interval '30 days'
       GROUP BY 1 ORDER BY 2 DESC LIMIT 3) x;
    t := t || '- ' || v_attente || ' offre' || CASE WHEN v_attente > 1 THEN 's attendent' ELSE ' attend' END || ' ta réponse'
           || CASE WHEN v_attente > 3 THEN ' (les plus récentes : ' ELSE ' (' END || v_line || E').\n';
    v_next := array_append(v_next, 'réponds aux offres en attente (« intéressé » ou « pas intéressé », dans l''application ou ici)'::text);
  END IF;
  SELECT count(*) INTO v_interesse FROM public.offres o
   WHERE o.client_id = p_client_id AND o.statut = 'interesse' AND o.updated_at > p_now - interval '45 days'
     AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = o.id AND v.client_id = p_client_id AND v.date_visite IS NOT NULL
                       AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee', 'proposee'));
  IF v_interesse > 0 THEN
    SELECT string_agg(x.adresse, ' ; ' ORDER BY x.d DESC) INTO v_line FROM (
      SELECT coalesce(o.adresse, 'adresse à confirmer') AS adresse, max(o.updated_at) AS d FROM public.offres o
       WHERE o.client_id = p_client_id AND o.statut = 'interesse' AND o.updated_at > p_now - interval '45 days'
         AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = o.id AND v.client_id = p_client_id AND v.date_visite IS NOT NULL
                           AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee', 'proposee'))
       GROUP BY 1 ORDER BY 2 DESC LIMIT 3) x;
    t := t || '- Tu as répondu « intéressé » à ' || v_interesse || ' offre' || CASE WHEN v_interesse > 1 THEN 's' ELSE '' END
           || ', sans date de visite pour l''instant (les dernières : ' || v_line || E').\n';
  END IF;
  t := t || E'\n';

  -- Visites
  t := t || E'Tes visites\n';
  v_n := 0;
  FOR r IN
    SELECT DISTINCT ON (v.date_visite) v.date_visite, coalesce(v.adresse, o.adresse) AS adresse, v.est_deleguee
      FROM public.visites v LEFT JOIN public.offres o ON o.id = v.offre_id
     WHERE v.client_id = p_client_id AND v.date_visite > p_now AND v.statut IN ('planifiee', 'confirmee', 'deleguee')
     ORDER BY v.date_visite, v.est_deleguee DESC NULLS LAST LIMIT 5
  LOOP
    v_n := v_n + 1;
    t := t || '- ' || v_jour[extract(dow FROM r.date_visite AT TIME ZONE 'Europe/Zurich')::int + 1] || ' '
           || to_char(r.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' à ' || replace(to_char(r.date_visite AT TIME ZONE 'Europe/Zurich', 'HH24:MI'), ':', 'h')
           || ' — ' || coalesce(r.adresse, 'adresse à confirmer')
           || CASE WHEN r.est_deleguee THEN ' (visite faite pour toi par notre équipe)' ELSE '' END || E'\n';
  END LOOP;
  IF v_n = 0 THEN t := t || E'- Aucune visite prévue pour l''instant.\n'; END IF;
  v_n := 0;
  FOR r IN
    SELECT DISTINCT ON (o.id) coalesce(v.adresse, o.adresse) AS adresse, v.date_visite
      FROM public.visites v JOIN public.offres o ON o.id = v.offre_id
     WHERE v.client_id = p_client_id AND v.date_visite BETWEEN p_now - interval '21 days' AND p_now
       AND v.statut IN ('planifiee', 'confirmee', 'deleguee', 'effectuee') AND v.client_decision IS NULL
       AND coalesce(o.statut, '') NOT IN ('refusee', 'refuse', 'souhaite_postuler', 'candidature_deposee', 'acceptee')
       AND NOT EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = o.id AND ca.client_id = p_client_id)
     ORDER BY o.id, v.date_visite DESC
     LIMIT 3
  LOOP
    v_n := v_n + 1;
    t := t || '- Visite du ' || to_char(r.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' — ' || coalesce(r.adresse, 'adresse à confirmer')
           || CASE WHEN v_achat THEN E' : dis-moi s''il t''intéresse pour une offre d''achat.\n' ELSE E' : dis-moi si tu veux postuler.\n' END;
  END LOOP;
  IF v_n > 0 THEN v_next := array_append(v_next, CASE WHEN v_achat THEN 'dis-moi ce que tu penses des biens visités' ELSE 'dis-moi pour chaque visite passée si tu veux postuler' END); END IF;
  t := t || E'\n';

  -- Candidatures (location)
  IF NOT v_achat THEN
  t := t || E'Tes candidatures\n';
  v_n := 0;
  FOR r IN
    SELECT ca.statut, ca.date_depot, ca.updated_at, coalesce(o.adresse, 'adresse à confirmer') AS adresse
      FROM public.candidatures ca LEFT JOIN public.offres o ON o.id = ca.offre_id
     WHERE ca.client_id = p_client_id
       AND (ca.statut <> 'refusee' OR ca.updated_at > p_now - interval '45 days')
     ORDER BY ca.updated_at DESC NULLS LAST LIMIT 8
  LOOP
    v_n := v_n + 1;
    t := t || '- ' || r.adresse || ' : ' || CASE r.statut
        WHEN 'demande_postulation' THEN 'ta demande de postulation est enregistrée, le dossier est en préparation'
        WHEN 'en_attente' THEN 'dossier envoyé à la régie' || coalesce(' le ' || to_char(r.date_depot AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY'), '') || ', en attente de sa réponse'
        WHEN 'refusee' THEN 'malheureusement non retenue par la régie'
        WHEN 'signature_effectuee' THEN 'bail signé'
        WHEN 'bail_conclu' THEN 'bail conclu'
        WHEN 'cles_remises' THEN 'clés remises'
        ELSE 'en cours' END || E'.\n';
  END LOOP;
  IF v_n = 0 THEN t := t || E'- Aucune candidature pour l''instant : après une visite qui te plaît, dis-moi « je veux postuler ».\n'; END IF;
  t := t || E'\n';
  END IF;

  -- Pièces du dossier (location) : mêmes règles que le contrôle de postulation (process-postulation-job/logic.ts),
  -- documents du client et de son compte ; RC ménage jamais exigée.
  IF NOT v_achat THEN
    SELECT array_remove(ARRAY[
      CASE WHEN (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document IN ('piece_identite', 'permis_sejour')) < 1
           THEN CASE WHEN c.type_permis IN ('B', 'C', 'F', 'N') THEN 'permis de séjour (recto et verso)' ELSE 'pièce d''identité (recto et verso)' END END,
      CASE WHEN (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document = 'fiche_salaire') < 3
           THEN 'fiches de salaire (' || (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document = 'fiche_salaire') || ' sur 3, il faut les 3 dernières)' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document = 'extrait_poursuites' AND d.date_upload > p_now - interval '90 days')
           THEN 'extrait de l''office des poursuites de moins de 3 mois' END,
      CASE WHEN (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document = 'attestation_domicile') < 1 THEN 'attestation de domicile' END,
      CASE WHEN (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id)
                   AND d.type_document IN ('contrat_travail', 'attestation_employeur')) < 1 THEN 'contrat de travail ou attestation de l''employeur' END,
      CASE WHEN c.revenus_mensuels IS NULL OR c.revenus_mensuels::text IN ('', '0') THEN 'ton revenu mensuel (à indiquer dans ton profil)' END,
      CASE WHEN nullif(trim(coalesce(c.type_permis, '')), '') IS NULL THEN 'ton type de permis (à indiquer dans ton profil)' END
    ], NULL) INTO v_manque;
    t := t || E'Ton dossier de candidature\n';
    IF cardinality(v_manque) = 0 THEN
      t := t || E'- Ton dossier est complet : je peux le présenter dès qu''un bien te plaît.\n';
    ELSE
      t := t || '- Pour que ton dossier puisse partir, il manque : ' || array_to_string(v_manque, ', ') || E'.\n';
      v_next := array_append(v_next, 'complète ton dossier dans « Mes documents » (une photo nette suffit) : sans ces pièces, les régies ne le prennent pas'::text);
    END IF;
    IF c.extrait_poursuites_date_emission IS NOT NULL AND c.extrait_poursuites_date_emission < (p_now AT TIME ZONE 'Europe/Zurich')::date - 90 THEN
      t := t || '- Ton dernier extrait des poursuites date du ' || to_char(c.extrait_poursuites_date_emission, 'DD.MM.YYYY') || E' : il a plus de 3 mois, il faut le renouveler.\n';
    END IF;
    SELECT string_agg(DISTINCT coalesce(dr.document_label, dr.document_type), ', ') INTO v_line
      FROM public.document_requests dr WHERE dr.client_id = p_client_id AND dr.status = 'pending';
    IF v_line IS NOT NULL THEN
      t := t || '- Ton agent t''a aussi demandé : ' || v_line || E'.\n';
    END IF;
    t := t || E'- L''attestation RC ménage est conseillée mais jamais obligatoire.\n\n';
  END IF;

  -- Pièces du dossier de financement (achat) : mêmes listes que « Mes documents » (parcours achat).
  IF v_achat THEN
    SELECT array_remove(ARRAY[
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'piece_identite') THEN 'pièce d''identité' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'extrait_poursuites') THEN 'extrait de l''office des poursuites' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'certificat_salaire') THEN 'certificat de salaire annuel' END,
      CASE WHEN (SELECT count(*) FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document LIKE 'fiche_salaire%') < 3 THEN '3 dernières fiches de salaire' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'contrat_travail') THEN 'contrat de travail' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'releve_bancaire_fonds_propres') THEN 'relevé bancaire des fonds propres' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'decision_taxation') THEN 'dernière décision de taxation' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'accord_transmission') THEN 'accord de transmission aux partenaires financiers' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE (d.client_id = p_client_id OR d.user_id = c.user_id) AND d.type_document = 'consentement_donnees') THEN 'consentement au traitement des données financières' END
    ], NULL) INTO v_manque;
    t := t || E'Ton dossier de financement\n';
    IF cardinality(v_manque) = 0 THEN
      t := t || E'- Ton dossier est complet : ton courtier peut lancer l''appel d''offres bancaire.\n\n';
    ELSE
      t := t || '- Pour lancer l''appel d''offres bancaire (indépendant et transparent), il manque : ' || array_to_string(v_manque, ', ') || E'.\n\n';
      v_next := array_append(v_next, 'dépose les pièces de financement dans « Mes documents » (une photo nette ou un PDF suffit)'::text);
    END IF;
  END IF;

  -- Prochaines étapes
  t := t || E'Prochaines étapes\n';
  IF cardinality(v_next) = 0 THEN
    t := t || CASE WHEN v_achat THEN E'- Rien à faire de ton côté pour l''instant : ton courtier continue les recherches et je te préviens dès qu''il y a du nouveau.\n'
                   ELSE E'- Rien à faire de ton côté pour l''instant : je continue les recherches et je te préviens dès qu''il y a du nouveau.\n' END;
  ELSE
    FOR i IN 1 .. cardinality(v_next) LOOP
      t := t || '- ' || upper(left(v_next[i], 1)) || substr(v_next[i], 2) || E'.\n';
    END LOOP;
  END IF;
  t := t || E'\nUne question sur un point ? Réponds-moi ici, je suis là.';
  RETURN t;
END;
$$;

-- Publication dans la conversation de chaque client actif (une fois par clé), 8h – 20h, serveur uniquement.
CREATE OR REPLACE FUNCTION public.steeve_envoyer_point_clients(p_cle text, p_client_id uuid DEFAULT NULL, p_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_conv uuid;
  v_hour int := extract(hour FROM now() AT TIME ZONE 'Europe/Zurich');
  v_sent int := 0;
  v_skip jsonb := '[]'::jsonb;
  v_apercu jsonb := '[]'::jsonb;
  v_p text;
  v_c text;
BEGIN
  IF coalesce(p_cle, '') !~ '^[a-z0-9_]{6,60}$' THEN
    RAISE EXCEPTION 'Clé invalide';
  END IF;
  IF NOT p_dry_run AND (v_hour < 8 OR v_hour >= 20) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'hors des heures clients (8h – 20h)');
  END IF;
  FOR r IN
    SELECT cl.id, public.steeve_person_name(cl.user_id) AS nom
      FROM public.clients cl
     WHERE cl.statut = 'actif' AND cl.anonymise_at IS NULL AND cl.user_id IS NOT NULL
       AND public.steeve_client_servi(cl.id)
       AND (p_client_id IS NULL OR cl.id = p_client_id)
     ORDER BY cl.created_at
  LOOP
    SELECT cv.id INTO v_conv FROM public.conversations cv
     WHERE cv.client_id = r.id::text AND cv.conversation_type = 'client-agent'
     ORDER BY cv.created_at LIMIT 1;
    IF v_conv IS NULL THEN
      v_skip := v_skip || jsonb_build_object('client', r.nom, 'motif', 'pas de conversation');
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = v_conv AND m.payload ->> 'steeve_cle' = p_cle || ':presentation') THEN
      v_skip := v_skip || jsonb_build_object('client', r.nom, 'motif', 'déjà envoyé');
      CONTINUE;
    END IF;
    v_p := public.steeve_presentation_client(r.id);
    v_c := public.steeve_compte_rendu_client(r.id);
    IF v_p IS NULL OR v_c IS NULL THEN
      v_skip := v_skip || jsonb_build_object('client', r.nom, 'motif', 'données incomplètes');
      CONTINUE;
    END IF;
    IF p_dry_run THEN
      v_apercu := v_apercu || jsonb_build_object('client', r.nom, 'presentation', v_p, 'compte_rendu', v_c);
      CONTINUE;
    END IF;
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload, read, created_at)
    VALUES (v_conv, 'steeve', 'assistant', v_p, jsonb_build_object('steeve_operateur', true, 'steeve_cle', p_cle || ':presentation'), false, now()),
           (v_conv, 'steeve', 'assistant', v_c, jsonb_build_object('steeve_operateur', true, 'steeve_cle', p_cle || ':compte_rendu'), false, now() + interval '2 seconds');
    v_sent := v_sent + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'envoyes', v_sent, 'ignores', v_skip, 'apercu', v_apercu);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_envoyer_point_clients(text, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.steeve_compte_rendu_client(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.steeve_presentation_client(uuid) FROM PUBLIC, anon, authenticated;
