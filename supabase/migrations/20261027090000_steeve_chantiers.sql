-- Steeve : ce qu'il ne pouvait pas faire (analyse des échanges du 25-26.10.2026).
--  1. Visite déclarée effectuée par le client (la postulation se débloque) ;
--  2. créneau « proposé » accepté par le client (visite confirmée) ; statut de visite corrigé par l'admin ;
--  3. contact de l'annonceur : carnet vérifié (annonce, réponse reçue, admin), recherche du contact par la routine Chrome,
--     formulaire du portail, liste « à appeler » pour l'admin ; une relance sans premier contact devient une demande de visite ;
--  4. e-mails à rattacher : liste avec suggestion, rattachement ou classement par l'admin, puis traitement par Steeve ;
--  5. « envoyé » prouvé : preuve d'envoi lisible, candidature « en attente » sans preuve n'est plus « déjà envoyée »,
--     reprise d'un dossier déclaré déposé sans preuve ;
--  6. annulation du dernier changement de critères ;
--  7. factures : identité de facturation pour AbaNinja (adresse e-mail du compte, factures connues) ;
--  8. demandes formelles : résiliation, remboursement, rendez-vous / rappel dans l'agenda de l'agent.

-- ---------- registre : nouveaux types ----------
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind = ANY (ARRAY[
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier', 'recherche_offres',
  'envoi_piece_regie', 'inscription_visite', 'recherche_contact', 'action_client']));
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_canal_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_canal_check CHECK (canal IS NULL OR canal = ANY (ARRAY['email', 'flatfox', 'app', 'interne', 'portail']));
ALTER TABLE public.steeve_proposals DROP CONSTRAINT IF EXISTS steeve_proposals_kind_check;
ALTER TABLE public.steeve_proposals ADD CONSTRAINT steeve_proposals_kind_check CHECK (kind = ANY (ARRAY[
  'note_agent', 'changement_criteres', 'relance_regie', 'preuve_paiement', 'resiliation', 'remboursement', 'rendez_vous', 'facture']));

-- Journal d'une action faite pour un client (une ligne par action, clé unique fournie par l'appelant).
CREATE OR REPLACE FUNCTION public.steeve_journal_client(p_client_id uuid, p_offre_id uuid, p_cle text, p_note text, p_controles jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, offre_id, statut, responsable, note, controles, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'client', p_client_id, p_offre_id, 'fait', 'steeve', left(p_note, 1000), coalesce(p_controles, '{}'::jsonb), now(),
          'via Steeve', p_cle, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.steeve_journal_client(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_journal_client(uuid, uuid, text, text, jsonb) TO service_role;

-- ---------- 1. visite effectuée déclarée par le client ----------
CREATE OR REPLACE FUNCTION public.steeve_client_visite_effectuee(p_client_id uuid, p_offre_id uuid, p_date timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v record;
  v_futur timestamptz;
  v_id uuid;
BEGIN
  SELECT id, adresse, statut, agent_id INTO o FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable dans ton dossier.');
  END IF;
  -- Visite passée de ce bien (la plus récente), hors annulée / refusée.
  SELECT id, statut, date_visite, est_deleguee INTO v FROM public.visites
   WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') NOT IN ('annulee', 'refusee')
     AND date_visite <= now()
   ORDER BY date_visite DESC LIMIT 1;
  IF FOUND THEN
    IF v.statut = 'effectuee' THEN
      RETURN jsonb_build_object('ok', true, 'deja', true, 'bien', o.adresse, 'visite_id', v.id,
                                'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'));
    END IF;
    UPDATE public.visites
       SET statut = 'effectuee', client_confirme_visite_at = coalesce(client_confirme_visite_at, now()), updated_at = now(),
           notes = left(coalesce(notes || E'\n', '') || 'Visite déclarée effectuée par le client (via Steeve) le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 2000)
     WHERE id = v.id;
    v_id := v.id;
  ELSE
    SELECT min(date_visite) INTO v_futur FROM public.visites
     WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') NOT IN ('annulee', 'refusee') AND date_visite > now();
    IF v_futur IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'La visite de ce bien est prévue le ' || to_char(v_futur AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY à HH24"h"MI') || ' : elle n''a pas encore eu lieu.');
    END IF;
    -- Aucune visite enregistrée : le client l'a faite lui-même (portail, régie) ; il faut sa date.
    IF p_date IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'date_requise', true, 'motif', 'Aucune visite enregistrée pour ce bien : demande au client la date (et l''heure) de sa visite.');
    END IF;
    IF p_date > now() OR p_date < now() - interval '60 days' THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Date de visite invalide (passée, il y a moins de 60 jours).');
    END IF;
    INSERT INTO public.visites (offre_id, client_id, agent_id, adresse, date_visite, statut, source, est_deleguee, client_confirme_visite_at, notes)
    VALUES (p_offre_id, p_client_id, coalesce(o.agent_id, 'ca53c5a5-6a41-4216-a93b-4d3238ad13a6'), o.adresse, p_date, 'effectuee', 'declaree_client', false, now(),
            'Visite faite par le client et déclarée via Steeve')
    RETURNING id INTO v_id;
  END IF;
  IF coalesce(o.statut, '') IN ('envoyee', 'vue', 'interesse', 'visite_planifiee', 'visite_confirmee') THEN
    UPDATE public.offres SET statut = 'visite_effectuee', updated_at = now() WHERE id = p_offre_id;
  END IF;
  PERFORM public.steeve_journal_client(p_client_id, p_offre_id, 'visite_effectuee:' || v_id, 'Visite déclarée effectuée par le client');
  RETURN jsonb_build_object('ok', true, 'deja', false, 'bien', o.adresse, 'visite_id', v_id,
                            'postulation_possible', public.visite_permet_postuler(v_id));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_visite_effectuee(uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_visite_effectuee(uuid, uuid, timestamptz) TO service_role;

-- ---------- 2. confirmer une visite (créneau proposé accepté) ----------
DROP FUNCTION IF EXISTS public.steeve_client_confirmer_visite(uuid, uuid);
CREATE OR REPLACE FUNCTION public.steeve_client_confirmer_visite(p_client_id uuid, p_offre_id uuid, p_date timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.visites
   WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') NOT IN ('annulee', 'effectuee', 'refusee') AND date_visite > now();
  IF n > 1 AND p_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Plusieurs créneaux à venir pour ce bien : demande au client lequel il confirme.',
      'creneaux', (SELECT jsonb_agg(to_char(date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') ORDER BY date_visite) FROM public.visites
                    WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') NOT IN ('annulee', 'effectuee', 'refusee') AND date_visite > now()));
  END IF;
  SELECT vi.id, vi.statut, vi.date_visite, vi.client_confirme_visite_at, vi.est_deleguee, o.adresse INTO v
    FROM public.visites vi JOIN public.offres o ON o.id = vi.offre_id
   WHERE vi.offre_id = p_offre_id AND vi.client_id = p_client_id AND coalesce(vi.statut, '') NOT IN ('annulee', 'effectuee', 'refusee')
     AND vi.date_visite > now()
     AND (p_date IS NULL OR abs(extract(epoch FROM vi.date_visite - p_date)) < 3600)
   ORDER BY vi.date_visite LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', CASE WHEN p_date IS NULL THEN 'Aucune visite à venir avec une date pour ce bien.' ELSE 'Aucun créneau à cette date pour ce bien.' END);
  END IF;
  IF v.client_confirme_visite_at IS NOT NULL AND v.statut <> 'proposee' THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'bien', v.adresse, 'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'deleguee', v.est_deleguee);
  END IF;
  -- Créneau proposé par l'agent / l'annonceur : accepté par le client, la visite devient confirmée.
  UPDATE public.visites
     SET client_confirme_visite_at = coalesce(client_confirme_visite_at, now()),
         statut = CASE WHEN statut = 'proposee' THEN 'confirmee' ELSE statut END, updated_at = now()
   WHERE id = v.id;
  UPDATE public.offres SET statut = 'visite_confirmee', updated_at = now()
   WHERE id = p_offre_id AND coalesce(statut, '') IN ('envoyee', 'vue', 'interesse', 'visite_planifiee');
  PERFORM public.steeve_journal_client(p_client_id, p_offre_id, 'visite_confirmee:' || v.id,
    CASE WHEN v.statut = 'proposee' THEN 'Créneau proposé accepté par le client' ELSE 'Présence confirmée par le client' END);
  RETURN jsonb_build_object('ok', true, 'deja', false, 'etait_proposee', v.statut = 'proposee', 'bien', v.adresse,
    'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'deleguee', v.est_deleguee);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_confirmer_visite(uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_confirmer_visite(uuid, uuid, timestamptz) TO service_role;

-- Statut d'une visite corrigé par l'admin (effectuée, confirmée, annulée), avec la note de l'offre.
CREATE OR REPLACE FUNCTION public.admin_steeve_visite_statut(p_offre_id uuid, p_statut text, p_date timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_statut NOT IN ('effectuee', 'confirmee', 'annulee') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'statut invalide (effectuee, confirmee, annulee)');
  END IF;
  SELECT id, client_id, adresse, statut INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  SELECT id, statut, date_visite INTO v FROM public.visites
   WHERE offre_id = p_offre_id AND client_id = o.client_id AND coalesce(statut, '') NOT IN ('annulee', 'refusee')
     AND (p_date IS NULL OR abs(extract(epoch FROM date_visite - p_date)) < 3600)
     AND (p_statut <> 'effectuee' OR date_visite <= now())
   ORDER BY CASE WHEN p_statut = 'effectuee' THEN -extract(epoch FROM date_visite) ELSE extract(epoch FROM date_visite) END
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', CASE WHEN p_statut = 'effectuee' THEN 'aucune visite passée pour ce bien (fixer_visite d''abord, ou une date)' ELSE 'aucune visite correspondante' END);
  END IF;
  UPDATE public.visites SET statut = p_statut, updated_at = now(),
         client_confirme_visite_at = CASE WHEN p_statut IN ('effectuee', 'confirmee') THEN coalesce(client_confirme_visite_at, now()) ELSE client_confirme_visite_at END
   WHERE id = v.id;
  IF p_statut = 'effectuee' AND coalesce(o.statut, '') IN ('envoyee', 'vue', 'interesse', 'visite_planifiee', 'visite_confirmee') THEN
    UPDATE public.offres SET statut = 'visite_effectuee', updated_at = now() WHERE id = p_offre_id;
  ELSIF p_statut = 'confirmee' AND coalesce(o.statut, '') IN ('envoyee', 'vue', 'interesse', 'visite_planifiee') THEN
    UPDATE public.offres SET statut = 'visite_confirmee', updated_at = now() WHERE id = p_offre_id;
  END IF;
  INSERT INTO public.steeve_actions (kind, canal, source, requested_by, client_id, offre_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'admin', auth.uid(), o.client_id, p_offre_id, 'fait', 'humain', 'Visite passée en « ' || p_statut || ' » par l''admin', now(), 'admin',
          'visite_statut:' || v.id || ':' || p_statut, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'visite_id', v.id, 'client_id', o.client_id, 'bien', o.adresse, 'avant', v.statut, 'apres', p_statut,
    'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_visite_statut(uuid, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_visite_statut(uuid, text, timestamptz) TO authenticated, service_role;

-- ---------- 3. contact de l'annonceur ----------
CREATE TABLE IF NOT EXISTS public.steeve_carnet_annonceurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle text NOT NULL UNIQUE,
  nom text,
  email text,
  telephone text,
  source text NOT NULL CHECK (source IN ('annonce', 'reponse', 'admin')),
  verifie boolean NOT NULL DEFAULT false,
  offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL,
  maj_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
ALTER TABLE public.steeve_carnet_annonceurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent le carnet des annonceurs" ON public.steeve_carnet_annonceurs;
CREATE POLICY "Admins lisent le carnet des annonceurs" ON public.steeve_carnet_annonceurs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Annonceur d'une annonce : agence nommée dans le lien immobilier.ch (« …/<agence>-<n°>/… »), sinon l'annonce elle-même.
CREATE OR REPLACE FUNCTION public.steeve_annonceur_cle(p_lien text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_lien ~* 'immobilier\.ch/(fr|de|en|it)/(louer|acheter|kaufen|mieten)/[^/]+/[^/]+/[^/]+/[^/]*-([0-9]+)/'
      THEN 'immobilier.ch:' || (regexp_match(p_lien, 'immobilier\.ch/(?:fr|de|en|it)/(?:louer|acheter|kaufen|mieten)/[^/]+/[^/]+/[^/]+/[^/]*-([0-9]+)/', 'i'))[1]
    ELSE NULL END;
$$;

-- Adresses e-mail connues de la régie / de l'annonceur d'une offre (contacts, fiche, compte rendu, carnet vérifié).
CREATE OR REPLACE FUNCTION public.steeve_emails_regie(p_offre_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT lower(e)) FILTER (WHERE e IS NOT NULL), '{}')
    FROM (
      SELECT ca.annonceur_email AS e FROM public.contacts_annonceurs ca WHERE ca.offre_id = p_offre_id
      UNION ALL
      SELECT (regexp_matches(coalesce(o.contact_gerance, '') || ' ' || coalesce(o.contact_annonceur, '') || ' ' || coalesce(o.contact_visite, ''),
                             '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g'))[1]
        FROM public.offres o WHERE o.id = p_offre_id
      UNION ALL
      SELECT (regexp_matches(coalesce(v.compte_rendu ->> 'contact_regie', '') || ' ' || coalesce(v.compte_rendu ->> 'autres_infos', ''),
                             '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g'))[1]
        FROM public.visites v JOIN public.offres o ON o.id = v.offre_id
       WHERE v.offre_id = p_offre_id AND v.client_id = o.client_id
      UNION ALL
      SELECT k.email FROM public.offres o JOIN public.steeve_carnet_annonceurs k ON k.cle = public.steeve_annonceur_cle(o.lien_annonce)
       WHERE o.id = p_offre_id AND k.verifie AND k.email IS NOT NULL
    ) s
   WHERE e ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
     AND lower(e) NOT LIKE '%@immo-rama.ch' AND lower(e) NOT LIKE '%@logisorama.ch';
$$;

-- Contact relevé (annonce, réponse reçue, admin) : fiche de l'offre, carnet de l'agence, et reprise des demandes bloquées.
CREATE OR REPLACE FUNCTION public.steeve_contact_annonceur_enregistrer(p_offre_id uuid, p_email text, p_telephone text, p_nom text, p_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_email text := lower(nullif(trim(p_email), ''));
  v_tel text := nullif(regexp_replace(coalesce(p_telephone, ''), '[^0-9+ ]', '', 'g'), '');
  v_nom text := left(nullif(trim(p_nom), ''), 120);
  v_cle text;
  v_ligne text;
  v_reprises integer := 0;
BEGIN
  IF NOT (public.steeve_executant_autorise() OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_source NOT IN ('annonce', 'reponse', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'source invalide');
  END IF;
  IF v_email IS NOT NULL AND (v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR v_email ~* '@(immo-rama|logisorama)\.ch$'
                              OR v_email ~* '@(user\.)?(flatfox|homegate|immobilier|immoscout24|anibis|newhome)\.ch$') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'adresse e-mail refusée (format, adresse de l''agence ou relais d''un portail)');
  END IF;
  IF v_email IS NULL AND v_tel IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'ni e-mail ni téléphone');
  END IF;
  SELECT id, lien_annonce, contact_annonceur INTO o FROM public.offres WHERE id = p_offre_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  v_ligne := concat_ws(' — ', v_nom, v_email, v_tel);
  IF position(coalesce(v_email, v_tel) IN coalesce(o.contact_annonceur, '')) = 0 THEN
    UPDATE public.offres SET contact_annonceur = left(concat_ws(E'\n', nullif(o.contact_annonceur, ''), v_ligne || ' (' || p_source || ')'), 1000), updated_at = now()
     WHERE id = p_offre_id;
  END IF;
  v_cle := public.steeve_annonceur_cle(o.lien_annonce);
  IF v_cle IS NOT NULL THEN
    INSERT INTO public.steeve_carnet_annonceurs (cle, nom, email, telephone, source, verifie, offre_id, maj_par)
    VALUES (v_cle, v_nom, v_email, v_tel, p_source, true, p_offre_id, auth.uid())
    ON CONFLICT (cle) DO UPDATE
      SET nom = coalesce(EXCLUDED.nom, steeve_carnet_annonceurs.nom),
          email = coalesce(EXCLUDED.email, steeve_carnet_annonceurs.email),
          telephone = coalesce(EXCLUDED.telephone, steeve_carnet_annonceurs.telephone),
          source = EXCLUDED.source, verifie = true, maj_par = EXCLUDED.maj_par, updated_at = now();
  END IF;
  -- Demandes bloquées faute d'adresse (cette offre, et les offres de la même agence) : reprises par Steeve.
  IF v_email IS NOT NULL THEN
    UPDATE public.steeve_actions a
       SET statut = 'a_faire', motif = NULL, verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL, updated_at = now(), derniere_activite = now(),
           etapes = public.steeve_tache_evt(a.etapes, jsonb_build_object('le', now(), 'evt', 'relancee', 'source', 'contact_' || p_source))
     WHERE a.kind IN ('demande_visite', 'demande_qr') AND a.statut = 'bloque' AND a.responsable = 'steeve'
       AND (a.motif ILIKE 'Aucune adresse%' OR a.motif ILIKE 'Plusieurs régies possibles%')
       AND (a.offre_id = p_offre_id OR (v_cle IS NOT NULL AND a.offre_id IN (SELECT id FROM public.offres WHERE public.steeve_annonceur_cle(lien_annonce) = v_cle)));
    GET DIAGNOSTICS v_reprises = ROW_COUNT;
    UPDATE public.steeve_actions
       SET statut = 'fait', preuve = left('contact relevé (' || p_source || ') : ' || v_ligne, 1000), executed_at = now(), updated_at = now(),
           verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL
     WHERE kind = 'recherche_contact' AND statut IN ('a_faire', 'bloque', 'en_cours') AND offre_id = p_offre_id
       AND (verrou_jusqu IS NULL OR verrou_jusqu <= now() OR p_source <> 'admin');
  END IF;
  RETURN jsonb_build_object('ok', true, 'agence', v_cle, 'contact', v_ligne, 'demandes_reprises', v_reprises);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_contact_annonceur_enregistrer(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_contact_annonceur_enregistrer(uuid, text, text, text, text) TO authenticated, service_role;

-- Demande partie par le formulaire de contact du portail (routine Chrome) : la demande bloquée attend la réponse.
CREATE OR REPLACE FUNCTION public.steeve_contact_portail_envoye(p_offre_id uuid, p_portail text, p_preuve text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  o record;
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, adresse, client_id INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  UPDATE public.steeve_actions
     SET statut = CASE WHEN kind = 'demande_qr' THEN 'en_attente_formulaire' ELSE 'en_attente_regie' END,
         canal = 'portail', motif = NULL, executed_at = now(), updated_at = now(), derniere_activite = now(),
         preuve = left('formulaire de contact ' || coalesce(p_portail, 'portail') || ' — ' || coalesce(p_preuve, to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI')), 1000),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'envoye_portail'))
   WHERE offre_id = p_offre_id AND kind IN ('demande_visite', 'demande_qr') AND statut = 'bloque' AND motif ILIKE 'Aucune adresse%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    INSERT INTO public.contacts_annonceurs (offre_id, client_id, adresse, canal, envoye_le, statut, routine)
    VALUES (p_offre_id, o.client_id, o.adresse, 'formulaire', now(), 'envoye', 'steeve-chrome');
  END IF;
  RETURN jsonb_build_object('ok', true, 'demandes', n);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_contact_portail_envoye(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_contact_portail_envoye(uuid, text, text) TO authenticated, service_role;

-- Admin : contact donné à Steeve (« l'e-mail de la régie de X est … »).
CREATE OR REPLACE FUNCTION public.admin_steeve_contact_annonceur(p_offre_id uuid, p_email text, p_telephone text, p_nom text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_contact_annonceur_enregistrer(p_offre_id, p_email, p_telephone, p_nom, 'admin');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_contact_annonceur(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_contact_annonceur(uuid, text, text, text) TO authenticated, service_role;

-- Admin : annonceurs à appeler (demandes bloquées faute d'adresse, recherche de contact sans résultat).
CREATE OR REPLACE FUNCTION public.admin_steeve_a_appeler(p_limite integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH b AS (
      SELECT DISTINCT ON (a.offre_id) a.offre_id, a.client_id, a.kind, a.motif, a.created_at
        FROM public.steeve_actions a
       WHERE a.offre_id IS NOT NULL
         AND ((a.kind IN ('demande_visite', 'demande_qr') AND a.statut = 'bloque' AND a.motif ILIKE 'Aucune adresse%')
              OR (a.kind = 'recherche_contact' AND a.statut IN ('bloque', 'a_faire', 'en_cours')))
         AND a.created_at > now() - interval '30 days'
         -- Annonce Flatfox dont le chat est en cours ou a abouti : rien à appeler.
         AND NOT EXISTS (SELECT 1 FROM public.steeve_actions f WHERE f.offre_id = a.offre_id AND f.canal = 'flatfox'
                           AND f.kind IN ('demande_visite', 'demande_qr') AND f.statut NOT IN ('bloque', 'bloque_acces', 'echec', 'annule'))
       ORDER BY a.offre_id, a.created_at DESC
    )
    SELECT jsonb_build_object('total', (SELECT count(*) FROM b), 'liste', coalesce(jsonb_agg(x ORDER BY x.depuis), '[]'::jsonb))
      FROM (
        SELECT b.offre_id, o.adresse AS bien, o.lien_annonce AS annonce, o.prix,
               concat_ws(' ', p.prenom, p.nom) AS client, b.client_id,
               CASE b.kind WHEN 'demande_qr' THEN 'demander le QR / formulaire de demande de location' ELSE 'demander une date de visite' END AS a_demander,
               coalesce(k.nom, (regexp_match(o.lien_annonce, '/([a-z0-9-]+)-[0-9]+/[^/]+$', 'i'))[1]) AS agence,
               k.telephone AS telephone_agence, k.email AS email_agence,
               nullif(o.contact_annonceur, '') AS contact_fiche,
               b.motif, to_char(b.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS depuis
          FROM b
          JOIN public.offres o ON o.id = b.offre_id
          LEFT JOIN public.clients c ON c.id = b.client_id
          LEFT JOIN public.profiles p ON p.id = c.user_id
          LEFT JOIN public.steeve_carnet_annonceurs k ON k.cle = public.steeve_annonceur_cle(o.lien_annonce)
         ORDER BY b.created_at
         LIMIT least(greatest(coalesce(p_limite, 20), 1), 50)
      ) x
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_a_appeler(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_a_appeler(integer) TO authenticated, service_role;

-- Relance demandée sans aucun premier contact : c'est une première demande de visite (e-mail, chat Flatfox ou recherche du contact).
CREATE OR REPLACE FUNCTION public.steeve_relance_sans_contact(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  v jsonb;
BEGIN
  SELECT id, offre_id, client_id, source, requested_by INTO t FROM public.steeve_actions WHERE id = p_task_id AND kind = 'relance_annonceur';
  IF NOT FOUND OR t.offre_id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF EXISTS (SELECT 1 FROM public.contacts_annonceurs WHERE offre_id = t.offre_id) THEN
    RETURN jsonb_build_object('ok', false, 'contact_existant', true);
  END IF;
  -- Annonce Flatfox : demande par le chat (routine Chrome) ; sinon e-mail de Steeve, ou recherche du contact si aucune adresse.
  IF EXISTS (SELECT 1 FROM public.offres WHERE id = t.offre_id AND lien_annonce ILIKE '%flatfox.ch%') THEN
    v := public.steeve_tache_creer('demande_visite', 'flatfox', t.offre_id, t.client_id, coalesce(t.source, 'admin'), 'routine-chrome',
                                   'Relance demandée sans premier contact : demande de visite', t.requested_by);
  ELSE
    v := public.steeve_tache_creer('demande_visite', 'email', t.offre_id, t.client_id, coalesce(t.source, 'admin'), 'steeve',
                                   'Relance demandée sans premier contact : demande de visite', t.requested_by);
  END IF;
  UPDATE public.steeve_actions SET statut = 'annule', motif = 'Aucun premier contact : remplacée par une demande de visite.', note = 'Demande de visite ' || coalesce(v ->> 'id', ''),
         verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL, updated_at = now()
   WHERE id = p_task_id;
  RETURN jsonb_build_object('ok', true, 'demande_visite', v);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_relance_sans_contact(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_relance_sans_contact(uuid) TO service_role;

-- ---------- 4. e-mails à rattacher ----------
CREATE OR REPLACE FUNCTION public.steeve_mail_get(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT e.id, e.mailbox, lower(e.from_email) AS from_email, e.from_name, e.subject, left(e.body_text, 6000) AS body_text,
           e.received_at, coalesce(e.auth_verified, false) AS auth_verified, 'mailbox' AS source
      FROM public.mailbox_emails e WHERE e.id = p_id
    UNION ALL
    SELECT m.id, s.address, lower(m.from_email), m.from_name, m.subject, left(coalesce(m.body_text, m.snippet), 6000),
           coalesce(m.internal_date, m.sent_at), false, 'app'
      FROM public.mail_messages m JOIN public.shared_mailboxes s ON s.id = m.mailbox_id WHERE m.id = p_id
    LIMIT 1
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_get(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_mail_get(uuid) TO service_role;

-- Offre cible (même forme que steeve_mail_context) pour un e-mail rattaché par l'admin.
CREATE OR REPLACE FUNCTION public.steeve_mail_cible(p_offre_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT o.id AS offre_id, o.client_id, o.adresse, o.statut, o.lien_annonce, p.prenom AS client_prenom, p.nom AS client_nom,
           public.steeve_emails_regie(o.id) AS emails_regie
      FROM public.offres o JOIN public.clients c ON c.id = o.client_id LEFT JOIN public.profiles p ON p.id = c.user_id
     WHERE o.id = p_offre_id
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_cible(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_mail_cible(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_steeve_mails_a_rattacher(p_limite integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM public.steeve_actions WHERE kind = 'lecture_mail' AND statut = 'a_valider'),
      'liste', coalesce(jsonb_agg(x ORDER BY x._t DESC), '[]'::jsonb))
      FROM (
        SELECT a.id AS action_id, to_char(a.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS recu, a.created_at AS _t,
               a.mailbox AS boite, a.destinataire AS expediteur, a.objet, a.motif, a.controles ->> 'categorie' AS categorie,
               a.controles ->> 'confiance' AS confiance,
               CASE WHEN a.offre_id IS NOT NULL THEN jsonb_build_object('offre_id', a.offre_id, 'bien', o.adresse,
                 'client_id', a.client_id, 'client', (SELECT concat_ws(' ', p.prenom, p.nom) FROM public.clients c JOIN public.profiles p ON p.id = c.user_id WHERE c.id = coalesce(a.client_id, o.client_id))) END AS suggestion,
               -- Même bien chez d'autres clients (« Plusieurs clients possibles ») : choix à faire.
               (SELECT jsonb_agg(jsonb_build_object('offre_id', o2.id, 'client', concat_ws(' ', p2.prenom, p2.nom), 'statut', o2.statut))
                  FROM public.offres o2 JOIN public.clients c2 ON c2.id = o2.client_id LEFT JOIN public.profiles p2 ON p2.id = c2.user_id
                 WHERE o.id IS NOT NULL AND lower(split_part(o2.adresse, ',', 1)) = lower(split_part(o.adresse, ',', 1))
                   AND coalesce(o2.statut, '') <> 'refusee' AND o2.updated_at > now() - interval '120 days') AS autres_dossiers_meme_bien
          FROM public.steeve_actions a
          LEFT JOIN public.offres o ON o.id = a.offre_id
         WHERE a.kind = 'lecture_mail' AND a.statut = 'a_valider'
         ORDER BY a.created_at DESC
         LIMIT least(greatest(coalesce(p_limite, 15), 1), 40)
      ) x
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_mails_a_rattacher(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_mails_a_rattacher(integer) TO authenticated, service_role;

-- Décision de l'admin sur un e-mail à vérifier : rattacher à une offre (Steeve le traite au prochain passage) ou classer.
CREATE OR REPLACE FUNCTION public.admin_steeve_rattacher_mail(p_action_id uuid, p_offre_id uuid, p_ignorer boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  o record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, statut, idempotency_key, controles INTO a FROM public.steeve_actions WHERE id = p_action_id AND kind = 'lecture_mail' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'e-mail introuvable');
  END IF;
  IF a.statut NOT IN ('a_valider', 'echec') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'e-mail déjà traité (' || a.statut || ')');
  END IF;
  IF p_ignorer THEN
    UPDATE public.steeve_actions SET statut = 'fait', note = 'Classé par l''admin : rien à faire.', requested_by = auth.uid(), updated_at = now(),
           etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'classe_admin'))
     WHERE id = p_action_id;
    RETURN jsonb_build_object('ok', true, 'classe', true);
  END IF;
  SELECT id, client_id, adresse INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  UPDATE public.steeve_actions
     SET statut = 'a_faire', offre_id = o.id, client_id = o.client_id, motif = NULL, requested_by = auth.uid(), updated_at = now(),
         controles = coalesce(controles, '{}'::jsonb) || jsonb_build_object('rattache', 'admin', 'rattache_le', now()),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'rattache_admin', 'offre_id', o.id))
   WHERE id = p_action_id;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'client_id', o.client_id,
                            'suite', 'Steeve applique l''e-mail à ce dossier à son prochain passage (dans la minute, entre 8 h et 20 h).');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_rattacher_mail(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_rattacher_mail(uuid, uuid, boolean) TO authenticated, service_role;

-- ---------- 5. « envoyé » prouvé ----------
CREATE OR REPLACE FUNCTION public.steeve_preuve_envoi(p_offre_id uuid, p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_rue text;
  o record;
BEGIN
  SELECT sa.preuve, sa.executed_at, sa.mailbox, sa.destinataire INTO r FROM public.steeve_actions sa
   WHERE sa.offre_id = p_offre_id AND sa.client_id = p_client_id AND sa.kind = 'envoi_dossier' AND sa.statut = 'fait'
   ORDER BY sa.executed_at DESC NULLS LAST LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('prouve', true, 'type', 'email_steeve', 'le', to_char(r.executed_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
                              'detail', 'Envoyé par Steeve depuis ' || coalesce(r.mailbox, 'relocation@') || ' à ' || coalesce(r.destinataire, 'la régie'));
  END IF;
  SELECT pp.envoye_le, pp.preuve_envoi, pp.canal, pp.destinataire_email INTO r FROM public.postulations_preparees pp
   WHERE pp.offre_id = p_offre_id AND pp.client_id = p_client_id AND pp.statut = 'envoye' AND nullif(pp.preuve_envoi, '') IS NOT NULL
   ORDER BY pp.envoye_le DESC NULLS LAST LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('prouve', true, 'type', coalesce(r.canal, 'email'), 'le', to_char(r.envoye_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
                              'detail', left(r.preuve_envoi, 200));
  END IF;
  -- E-mail réellement parti d'une boîte de l'agence (dossier « Envoyés ») vers une adresse externe, qui nomme le bien.
  SELECT adresse INTO o FROM public.offres WHERE id = p_offre_id;
  v_rue := lower(trim(split_part(coalesce(o.adresse, ''), ',', 1)));
  IF length(v_rue) >= 6 THEN
    SELECT m.sent_at, s.address AS boite, m.subject, m.to_list INTO r
      FROM public.mail_messages m
      JOIN public.shared_mailboxes s ON s.id = m.mailbox_id
      JOIN public.mail_folders f ON f.id = m.folder_id
     WHERE f.role = 'sent' AND s.address ILIKE '%@immo-rama.ch'
       AND coalesce(m.sent_at, m.internal_date) > now() - interval '120 days'
       AND (lower(coalesce(m.subject, '')) LIKE '%' || v_rue || '%' OR lower(left(coalesce(m.body_text, ''), 4000)) LIKE '%' || v_rue || '%')
       AND (lower(coalesce(m.subject, '')) ~ '(candidature|dossier|demande de location|postulation|bewerbung)'
            OR coalesce(m.has_attachments, false))
       AND m.to_list::text !~* '@(immo-rama|logisorama)\.ch'
     ORDER BY m.sent_at DESC NULLS LAST LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('prouve', true, 'type', 'email_envoye', 'le', to_char(r.sent_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
                                'detail', 'E-mail envoyé depuis ' || r.boite || ' : « ' || left(coalesce(r.subject, ''), 120) || ' »');
    END IF;
  END IF;
  RETURN jsonb_build_object('prouve', false,
    'declare_depose', EXISTS (SELECT 1 FROM public.offres WHERE id = p_offre_id AND statut IN ('candidature_deposee', 'acceptee'))
                      OR EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = p_offre_id AND ca.client_id = p_client_id
                                   AND ca.statut IN ('acceptee', 'bail_conclu', 'signature_effectuee', 'cles_remises', 'refusee')));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_preuve_envoi(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_preuve_envoi(uuid, uuid) TO service_role;

-- « Déjà envoyé » : preuve d'envoi, décision de la régie, ou dépôt déclaré par l'équipe sur l'offre.
-- Une candidature « en attente » (statut par défaut, posé aussi par d'anciens parcours) ne suffit plus.
CREATE OR REPLACE FUNCTION public.steeve_dossier_deja_envoye(p_offre_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = p_offre_id AND ca.client_id = p_client_id
                   AND ca.statut IN ('acceptee', 'bail_conclu', 'signature_effectuee', 'cles_remises', 'refusee'))
      OR EXISTS (SELECT 1 FROM public.offres o WHERE o.id = p_offre_id AND o.client_id = p_client_id
                   AND o.statut IN ('candidature_deposee', 'acceptee'))
      OR EXISTS (SELECT 1 FROM public.postulations_preparees pp WHERE pp.offre_id = p_offre_id AND pp.client_id = p_client_id AND pp.statut = 'envoye')
      OR EXISTS (SELECT 1 FROM public.steeve_actions sa WHERE sa.offre_id = p_offre_id AND sa.client_id = p_client_id AND sa.kind = 'envoi_dossier' AND sa.statut = 'fait')
      -- E-mail de candidature réellement parti d'une boîte de l'agence : jamais de second envoi.
      OR coalesce((public.steeve_preuve_envoi(p_offre_id, p_client_id) ->> 'prouve')::boolean, false);
$$;

-- Admin : preuve d'envoi d'un dossier (client + bien).
CREATE OR REPLACE FUNCTION public.admin_steeve_preuve_envoi(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT o2.id, o2.client_id, o2.adresse, o2.statut INTO o FROM public.offres o2 WHERE o2.id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'statut_offre', o.statut,
    'candidature', (SELECT ca.statut FROM public.candidatures ca WHERE ca.offre_id = o.id AND ca.client_id = o.client_id ORDER BY ca.created_at DESC LIMIT 1),
    'file', (SELECT j.status FROM public.postulation_jobs j WHERE j.offre_id = o.id AND j.client_id = o.client_id LIMIT 1),
    'preuve', public.steeve_preuve_envoi(o.id, o.client_id));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_preuve_envoi(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_preuve_envoi(uuid) TO authenticated, service_role;

-- Admin : dossier noté déposé mais jamais envoyé (aucune preuve) → remis dans le circuit de postulation.
CREATE OR REPLACE FUNCTION public.admin_steeve_postulation_pas_envoyee(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_preuve jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, client_id, adresse, statut INTO o FROM public.offres WHERE id = p_offre_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  v_preuve := public.steeve_preuve_envoi(o.id, o.client_id);
  IF (v_preuve ->> 'prouve')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Un envoi est prouvé : rien n''est remis en circuit.', 'preuve', v_preuve);
  END IF;
  IF EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = o.id AND ca.client_id = o.client_id
               AND ca.statut IN ('acceptee', 'bail_conclu', 'signature_effectuee', 'cles_remises', 'refusee')) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'La régie a déjà répondu à cette candidature : rien n''est remis en circuit.');
  END IF;
  UPDATE public.offres SET statut = 'souhaite_postuler', updated_at = now(), postulation_demandee_at = coalesce(postulation_demandee_at, now())
   WHERE id = o.id AND statut IN ('candidature_deposee', 'souhaite_postuler', 'visite_effectuee', 'interesse');
  UPDATE public.candidatures SET statut = 'demande_postulation', updated_at = now()
   WHERE offre_id = o.id AND client_id = o.client_id AND statut = 'en_attente';
  UPDATE public.postulations_preparees SET statut = 'erreur', motif_blocage = 'Noté envoyé sans preuve : remis en circuit par l''admin', updated_at = now()
   WHERE offre_id = o.id AND client_id = o.client_id AND statut = 'envoye' AND nullif(preuve_envoi, '') IS NULL;
  UPDATE public.postulation_jobs SET status = 'queued', attempt_count = 0, next_attempt_at = now(), locked_at = NULL, last_error = NULL
   WHERE offre_id = o.id AND client_id = o.client_id AND status IN ('failed', 'blocked', 'ready', 'completed');
  INSERT INTO public.steeve_actions (kind, canal, source, requested_by, client_id, offre_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'admin', auth.uid(), o.client_id, o.id, 'fait', 'humain',
          'Dossier noté « ' || coalesce(o.statut, '?') || ' » sans preuve d''envoi : remis en circuit par l''admin', now(), 'admin',
          'pas_envoye:' || o.id || ':' || extract(epoch FROM clock_timestamp())::text, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'avant', o.statut,
                            'suite', 'Le dossier repasse par la préparation puis le contrôle de Steeve avant l''envoi (reprendre_dossier pour l''exécuter tout de suite).');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_postulation_pas_envoyee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_postulation_pas_envoyee(uuid) TO authenticated, service_role;

-- ---------- 6. annuler le dernier changement de critères ----------
CREATE OR REPLACE FUNCTION public.steeve_client_annuler_criteres(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  v_av jsonb;
  v_now jsonb;
BEGIN
  SELECT id, controles, executed_at INTO a FROM public.steeve_actions
   WHERE kind = 'changement_criteres' AND client_id = p_client_id AND statut = 'fait' AND executed_at > now() - interval '14 days'
     AND coalesce(controles ->> 'annule', '') = ''
   ORDER BY executed_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucun changement de critères fait par Steeve ces 14 derniers jours.');
  END IF;
  v_av := a.controles -> 'avant';
  SELECT jsonb_build_object('budget_max', budget_max, 'pieces', pieces, 'region_recherche', region_recherche, 'type_bien', type_bien, 'souhaits_particuliers', souhaits_particuliers)
    INTO v_now FROM public.clients WHERE id = p_client_id FOR UPDATE;
  UPDATE public.clients
     SET budget_max = (v_av ->> 'budget_max')::numeric, pieces = (v_av ->> 'pieces')::numeric, region_recherche = v_av ->> 'region_recherche',
         type_bien = v_av ->> 'type_bien', souhaits_particuliers = v_av ->> 'souhaits_particuliers', updated_at = now()
   WHERE id = p_client_id;
  UPDATE public.steeve_actions SET controles = controles || jsonb_build_object('annule', now()), updated_at = now() WHERE id = a.id;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, controles, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('changement_criteres', 'app', 'client', p_client_id, 'fait', 'steeve', jsonb_build_object('avant', v_now, 'apres', v_av, 'annulation_de', a.id, 'annule', now()),
          'Retour aux critères précédents à la demande du client', now(), 'clients mis à jour',
          'criteres_annul:' || a.id, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'avant', v_now, 'apres', v_av, 'change_du', to_char(a.executed_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_annuler_criteres(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_annuler_criteres(uuid) TO service_role;

-- ---------- 7. facturation : identité du client pour AbaNinja ----------
-- Adresse e-mail du COMPTE (jamais celle écrite dans la conversation), nom, factures connues et état de l'activation.
CREATE OR REPLACE FUNCTION public.steeve_client_facturation(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'client_id', c.id,
    'nom', concat_ws(' ', p.prenom, p.nom),
    'emails', (SELECT coalesce(jsonb_agg(DISTINCT lower(e)) FILTER (WHERE e ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'), '[]'::jsonb)
                 FROM unnest(ARRAY[u.email, p.email, dm.email]) e),
    'factures_connues', (SELECT coalesce(jsonb_agg(DISTINCT f) FILTER (WHERE f IS NOT NULL AND f <> ''), '[]'::jsonb)
                           FROM unnest(ARRAY[c.abaninja_invoice_id, dm.abaninja_invoice_id]) f),
    'activation', jsonb_build_object('statut_client', c.statut, 'demande', dm.statut, 'acompte_chf', dm.montant_acompte,
                                     'paye_le', to_char(dm.date_paiement, 'DD.MM.YYYY'),
                                     'acompte_enregistre', EXISTS (SELECT 1 FROM public.acomptes ac WHERE ac.client_id = c.id AND ac.date_paiement IS NOT NULL)))
    FROM public.clients c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN auth.users u ON u.id = c.user_id
    LEFT JOIN LATERAL (SELECT d.* FROM public.demandes_mandat d
                        WHERE d.id = c.demande_mandat_id OR (c.demande_mandat_id IS NULL AND c.user_id IS NOT NULL AND d.user_id = c.user_id)
                        ORDER BY (d.id = c.demande_mandat_id) DESC NULLS LAST, d.created_at DESC LIMIT 1) dm ON true
   WHERE c.id = p_client_id;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_facturation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_facturation(uuid) TO service_role;

-- ---------- 8. demandes formelles (résiliation, remboursement, rendez-vous) ----------
-- Rappel / rendez-vous demandé : rappel dans l'agenda de l'agent du client (à confirmer par l'agent), sans doublon sur 48 h.
CREATE OR REPLACE FUNCTION public.steeve_client_demande_rappel(p_client_id uuid, p_objet text, p_disponibilites text, p_avec text, p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_id uuid;
  v_quand timestamptz;
  v_titre text;
BEGIN
  SELECT cl.id, cl.agent_id, concat_ws(' ', p.prenom, p.nom) AS nom INTO c
    FROM public.clients cl LEFT JOIN public.profiles p ON p.id = cl.user_id WHERE cl.id = p_client_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier introuvable.');
  END IF;
  SELECT id INTO v_id FROM public.calendar_events
   WHERE client_id = p_client_id AND event_type IN ('rappel', 'rendez_vous') AND status = 'planifie'
     AND title LIKE 'Demande de %' AND created_at > now() - interval '48 hours' LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'id', v_id);
  END IF;
  -- Rappel posé au prochain jour ouvré à 9 h (heure suisse) : l'agent fixe ensuite l'heure avec le client.
  v_quand := ((date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') + interval '1 day' +
              CASE extract(isodow FROM now() AT TIME ZONE 'Europe/Zurich') WHEN 5 THEN interval '2 day' WHEN 6 THEN interval '1 day' ELSE interval '0' END
              + interval '9 hours') AT TIME ZONE 'Europe/Zurich');
  v_titre := left('Demande de ' || CASE WHEN p_mode = 'rendez_vous' THEN 'rendez-vous' ELSE 'rappel' END || ' — ' || coalesce(nullif(c.nom, ''), 'client'), 120);
  INSERT INTO public.calendar_events (agent_id, client_id, created_by, event_type, title, description, event_date, status, priority, all_day)
  VALUES (c.agent_id, p_client_id,
          coalesce((SELECT a.user_id FROM public.agents a WHERE a.id = c.agent_id),
                   (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.user_id LIMIT 1)), CASE WHEN p_mode = 'rendez_vous' THEN 'rendez_vous' ELSE 'rappel' END, v_titre,
          left(concat_ws(E'\n', 'Objet : ' || coalesce(nullif(trim(p_objet), ''), 'non précisé'),
                         'Disponibilités du client : ' || coalesce(nullif(trim(p_disponibilites), ''), 'non précisées'),
                         CASE WHEN nullif(trim(p_avec), '') IS NOT NULL THEN 'Avec : ' || trim(p_avec) END,
                         'Demandé à Steeve dans la messagerie : heure à confirmer avec le client.'), 2000),
          v_quand, 'planifie', 'haute', false)
  RETURNING id INTO v_id;
  PERFORM public.steeve_journal_client(p_client_id, NULL, 'rappel:' || v_id, v_titre);
  RETURN jsonb_build_object('ok', true, 'deja', false, 'id', v_id, 'agent', c.agent_id IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_demande_rappel(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_demande_rappel(uuid, text, text, text, text) TO service_role;

-- Nouvelles demandes dans la conversation « Steeve » de l'admin : libellés.
CREATE OR REPLACE FUNCTION public.steeve_proposal_vers_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom text;
  v_label text := CASE NEW.kind WHEN 'note_agent' THEN 'Demande d''un client'
                                WHEN 'relance_regie' THEN 'Relance de régie à valider'
                                WHEN 'preuve_paiement' THEN 'Preuve de paiement à vérifier'
                                WHEN 'changement_criteres' THEN 'Changement de critères'
                                WHEN 'resiliation' THEN 'Demande de résiliation'
                                WHEN 'remboursement' THEN 'Demande de remboursement'
                                WHEN 'rendez_vous' THEN 'Demande de rendez-vous'
                                WHEN 'facture' THEN 'Facture à émettre ou à vérifier'
                                ELSE 'Demande à valider' END;
  v_admin record;
BEGIN
  SELECT public.steeve_person_name(c.user_id) INTO v_nom FROM public.clients c WHERE c.id = NEW.client_id;
  FOR v_admin IN SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public.steeve_post_admin(v_admin.user_id, 'proposition:' || NEW.id,
      '👋 ' || v_label || ' — ' || coalesce(v_nom, 'un client') || E'\n' || coalesce(NEW.title, '') || E'\n\n' || left(coalesce(NEW.body, ''), 1200) ||
      E'\n\nTu me dis ? (« oui, vas-y », « non », ou ta consigne) : je m''en occupe et je réponds à ' || coalesce(split_part(v_nom, ' ', 1), 'la personne') || '.',
      jsonb_build_object('kind', 'demande_validation', 'type', NEW.kind, 'proposal_id', NEW.id, 'client_id', NEW.client_id,
                         'conversation_id', NEW.conversation_id, 'offre_id', NEW.offre_id));
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'steeve_proposal_vers_admin: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Admin : la demande de résiliation / remboursement est-elle recevable ? (règles du cycle, mêmes que la page « Mon contrat »)
CREATE OR REPLACE FUNCTION public.admin_steeve_proposition(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT to_jsonb(x) FROM (
    SELECT sp.id, sp.kind, sp.status, sp.title, sp.body, sp.client_id, sp.conversation_id, sp.offre_id,
           to_char(sp.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS le,
           c.statut AS statut_client, c.refund_status, c.cancellation_requested_at, c.mandate_paused_at,
           to_char(c.mandat_date_signature AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS mandat_signe_le
      FROM public.steeve_proposals sp LEFT JOIN public.clients c ON c.id = sp.client_id
     WHERE sp.id = p_id) x);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_proposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_proposition(uuid) TO authenticated, service_role;

-- ---------- outils admin : correction d'une offre ----------
CREATE OR REPLACE FUNCTION public.admin_steeve_corriger_offre(p_offre_id uuid, p_adresse text, p_prix numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(p_adresse), '') IS NULL AND p_prix IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'rien à corriger');
  END IF;
  IF p_prix IS NOT NULL AND (p_prix < 100 OR p_prix > 50000000) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'prix hors bornes');
  END IF;
  SELECT id, client_id, adresse, prix INTO o FROM public.offres WHERE id = p_offre_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  UPDATE public.offres SET adresse = coalesce(left(nullif(trim(p_adresse), ''), 250), adresse), prix = coalesce(p_prix, prix), updated_at = now()
   WHERE id = p_offre_id;
  UPDATE public.visites SET adresse = left(trim(p_adresse), 250), updated_at = now()
   WHERE offre_id = p_offre_id AND nullif(trim(p_adresse), '') IS NOT NULL AND (date_visite IS NULL OR date_visite > now());
  INSERT INTO public.steeve_actions (kind, canal, source, requested_by, client_id, offre_id, statut, responsable, note, controles, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'admin', auth.uid(), o.client_id, o.id, 'fait', 'humain', 'Offre corrigée par l''admin',
          jsonb_build_object('avant', jsonb_build_object('adresse', o.adresse, 'prix', o.prix), 'apres', jsonb_build_object('adresse', coalesce(nullif(trim(p_adresse), ''), o.adresse), 'prix', coalesce(p_prix, o.prix))),
          now(), 'admin', 'offre_corrigee:' || o.id || ':' || extract(epoch FROM clock_timestamp())::text, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'avant', jsonb_build_object('adresse', o.adresse, 'prix', o.prix),
                            'apres', jsonb_build_object('adresse', coalesce(nullif(trim(p_adresse), ''), o.adresse), 'prix', coalesce(p_prix, o.prix)));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_corriger_offre(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_corriger_offre(uuid, text, numeric) TO authenticated, service_role;

-- Admin : facturation d'un client (pour l'outil factures du copilote).
CREATE OR REPLACE FUNCTION public.admin_steeve_facturation(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_client_facturation(p_client_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_facturation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_facturation(uuid) TO authenticated, service_role;

-- ---------- routine Chrome : contact de l'annonceur (S8) ----------
-- Appliqué directement dans routine_config (clé surveillance_chrome, sauvegarde surveillance_chrome_sauvegarde_20261026d) :
-- la boucle S réserve aussi 'recherche_contact' ; S8 relève le contact publié sur l'annonce (steeve_contact_annonceur_enregistrer),
-- sinon envoie la demande par le formulaire du portail (steeve_contact_portail_envoye), sinon « à appeler ».
