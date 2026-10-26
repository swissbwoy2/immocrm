-- Steeve, lot 5 : lecture des réponses des régies et des annonceurs reçues dans visites@ et relocation@
-- (e-mails relevés dans mailbox_emails). Steeve classe chaque e-mail et applique les règles de la routine de
-- surveillance (partie A) : visite fixée ou annulée, lien / QR de la demande de location reçu, refus, pièces
-- demandées, annonce retirée. Acceptation, bail et questions des régies restent à l'équipe (alerte).
-- Additive et idempotente.

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind IN (
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail'));

-- E-mails à lire : reçus depuis 3 jours dans visites@ ou relocation@, d'un expéditeur extérieur, pas encore lus par Steeve.
CREATE OR REPLACE FUNCTION public.steeve_mail_candidates(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x.received_at), '[]'::jsonb) FROM (
    SELECT e.id, e.mailbox, lower(e.from_email) AS from_email, e.from_name, e.subject, left(e.body_text, 6000) AS body_text,
           e.received_at, coalesce(e.auth_verified, false) AS auth_verified
      FROM public.mailbox_emails e
     WHERE e.mailbox IN ('visites@immo-rama.ch', 'relocation@immo-rama.ch')
       AND e.received_at > now() - interval '3 days'
       AND coalesce(e.from_email, '') <> ''
       AND lower(e.from_email) NOT LIKE '%@immo-rama.ch' AND lower(e.from_email) NOT LIKE '%@logisorama.ch'
       AND NOT EXISTS (SELECT 1 FROM public.steeve_actions sa
                        WHERE sa.idempotency_key IN ('mail:' || e.id::text, 'blanc:mail:' || e.id::text))
     ORDER BY e.received_at
     LIMIT least(greatest(coalesce(p_limit, 20), 1), 50)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_candidates(integer) FROM PUBLIC, anon, authenticated;

-- Offres des 30 derniers jours des clients servis, pour rattacher un e-mail à son bien et à son client.
CREATE OR REPLACE FUNCTION public.steeve_mail_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.client_id, o.adresse, o.statut, o.lien_annonce,
           p.prenom AS client_prenom, p.nom AS client_nom,
           (SELECT array_agg(DISTINCT ca.reference) FROM public.contacts_annonceurs ca WHERE ca.offre_id = o.id AND ca.reference IS NOT NULL) AS references,
           public.steeve_emails_regie(o.id) AS emails_regie,
           (SELECT ca.statut FROM public.candidatures ca WHERE ca.offre_id = o.id AND ca.client_id = o.client_id ORDER BY ca.created_at DESC LIMIT 1) AS candidature
      FROM public.offres o
      JOIN public.clients c ON c.id = o.client_id
      LEFT JOIN public.profiles p ON p.id = c.user_id
     WHERE coalesce(o.date_envoi, o.updated_at) > now() - interval '30 days'
       AND coalesce(o.statut, '') <> 'refusee'
       AND public.steeve_client_servi(o.client_id)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_context() FROM PUBLIC, anon, authenticated;

-- Note de suivi lue par le client (une ligne, 140 caractères au plus, remplace la précédente).
CREATE OR REPLACE FUNCTION public.steeve_set_note(p_offre_id uuid, p_note text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.offres SET commentaires = left(p_note, 140), updated_at = now() WHERE id = p_offre_id;
$$;
REVOKE ALL ON FUNCTION public.steeve_set_note(uuid, text) FROM PUBLIC, anon, authenticated;

-- Visite fixée par l'annonceur (règle A3) : pas de date passée ni à moins de 2 h, pas de conflit à ± 90 min
-- pour le même client. Renvoie si un message au client est attendu (client intéressé, pas déjà prévenu).
CREATE OR REPLACE FUNCTION public.steeve_apply_visite(p_offre_id uuid, p_client_id uuid, p_date timestamptz, p_fin timestamptz, p_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offre record;
  v_visite uuid;
  v_conflit boolean;
  v_label text := to_char(p_date AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' à ' || to_char(p_date AT TIME ZONE 'Europe/Zurich', 'HH24"h"MI');
BEGIN
  SELECT o.id, o.statut, o.adresse INTO v_offre FROM public.offres o WHERE o.id = p_offre_id AND o.client_id = p_client_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  IF p_date IS NULL OR p_date < now() + interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'date passée ou trop proche');
  END IF;
  -- Visite à venir (ou sans date) de ce bien : déplacée ; une visite déjà passée n'est jamais modifiée.
  SELECT id INTO v_visite FROM public.visites WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND coalesce(statut, '') <> 'annulee' AND (date_visite IS NULL OR date_visite > now())
   ORDER BY date_visite NULLS FIRST LIMIT 1;
  IF v_visite IS NOT NULL AND EXISTS (SELECT 1 FROM public.visites WHERE id = v_visite AND date_visite = p_date) THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'visite_id', v_visite);
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.visites v WHERE v.client_id = p_client_id AND v.offre_id IS DISTINCT FROM p_offre_id
                   AND coalesce(v.statut, '') <> 'annulee' AND abs(extract(epoch FROM v.date_visite - p_date)) < 90 * 60)
    INTO v_conflit;
  IF v_conflit THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'conflit', 'conflit', true);
  END IF;
  IF v_visite IS NULL THEN
    INSERT INTO public.visites (offre_id, client_id, agent_id, date_visite, date_visite_fin, adresse, statut, source)
    VALUES (p_offre_id, p_client_id, 'ca53c5a5-6a41-4216-a93b-4d3238ad13a6', p_date, p_fin, v_offre.adresse, 'planifiee', left(p_source, 40))
    RETURNING id INTO v_visite;
  ELSE
    UPDATE public.visites SET date_visite = p_date, date_visite_fin = p_fin, statut = 'planifiee', updated_at = now() WHERE id = v_visite;
  END IF;
  PERFORM public.steeve_set_note(p_offre_id, 'Visite fixée au ' || v_label || ', confirmée par l''annonceur.');
  UPDATE public.contacts_annonceurs SET reponse_le = now(), statut = 'repondu', updated_at = now()
   WHERE offre_id = p_offre_id AND reponse_le IS NULL;
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite, 'adresse', v_offre.adresse, 'quand', v_label,
    'message_requis', v_offre.statut IN ('interesse', 'visite_planifiee', 'souhaite_postuler'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_visite(uuid, uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;

-- Visite annulée par l'annonceur (A4).
CREATE OR REPLACE FUNCTION public.steeve_apply_annulation(p_offre_id uuid, p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visite record;
  v_statut text;
BEGIN
  SELECT statut INTO v_statut FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id;
  SELECT id, date_visite INTO v_visite FROM public.visites WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND coalesce(statut, '') <> 'annulee' AND date_visite > now() - interval '1 day' ORDER BY date_visite LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune visite à annuler');
  END IF;
  UPDATE public.visites SET statut = 'annulee', updated_at = now() WHERE id = v_visite.id;
  PERFORM public.steeve_set_note(p_offre_id, 'Visite du ' || to_char(v_visite.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY')
    || ' annulée par l''annonceur : votre agent cherche une nouvelle date.');
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite.id,
    'quand', to_char(v_visite.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY'),
    'message_requis', v_statut IN ('interesse', 'visite_planifiee', 'souhaite_postuler'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_annulation(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Candidature non retenue (A6, refus).
CREATE OR REPLACE FUNCTION public.steeve_apply_refus(p_offre_id uuid, p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand uuid;
BEGIN
  SELECT id INTO v_cand FROM public.candidatures WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND statut IN ('en_attente', 'demande_postulation') ORDER BY created_at DESC LIMIT 1;
  IF v_cand IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune candidature en attente');
  END IF;
  UPDATE public.candidatures SET statut = 'refusee', updated_at = now() WHERE id = v_cand;
  PERFORM public.steeve_set_note(p_offre_id, 'Candidature non retenue par la régie le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || '.');
  RETURN jsonb_build_object('ok', true, 'candidature_id', v_cand);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_refus(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Réponse qui demande une action de l'agent (pièces, question, inscription…) : signalée sur l'offre.
CREATE OR REPLACE FUNCTION public.steeve_flag_offre(p_offre_id uuid, p_note text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.offres SET needs_agent_action = true, commentaires = coalesce(left(p_note, 140), commentaires), updated_at = now()
   WHERE id = p_offre_id;
  UPDATE public.contacts_annonceurs SET reponse_le = coalesce(reponse_le, now()), statut = 'repondu', updated_at = now()
   WHERE offre_id = p_offre_id AND reponse_le IS NULL;
$$;
REVOKE ALL ON FUNCTION public.steeve_flag_offre(uuid, text) FROM PUBLIC, anon, authenticated;

-- Annonce louée ou retirée (A7).
CREATE OR REPLACE FUNCTION public.steeve_apply_retrait(p_offre_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.steeve_set_note(p_offre_id, 'Annonce retirée par l''annonceur le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || '.');
  UPDATE public.contacts_annonceurs SET statut = 'sans_suite', updated_at = now() WHERE offre_id = p_offre_id;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_retrait(uuid) FROM PUBLIC, anon, authenticated;

-- Lien de la demande de location reçu de la régie : ajouté au compte rendu de la visite, là où la routine
-- Postulation le cherche (« récupérer lien et QR depuis le compte rendu exact »).
CREATE OR REPLACE FUNCTION public.steeve_apply_lien(p_offre_id uuid, p_client_id uuid, p_lien text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visite uuid;
  v_line text;
BEGIN
  IF p_lien !~* '^https://[a-z0-9.-]+\.[a-z]{2,}/' OR length(p_lien) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'lien invalide');
  END IF;
  SELECT id INTO v_visite FROM public.visites WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND coalesce(statut, '') <> 'annulee' ORDER BY date_visite LIMIT 1;
  IF v_visite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune visite');
  END IF;
  v_line := 'Lien de la demande de location reçu de la régie le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' : ' || p_lien;
  UPDATE public.visites
     SET compte_rendu = jsonb_set(coalesce(compte_rendu, '{}'::jsonb), '{autres_infos}',
           to_jsonb(trim(both E'\n' FROM coalesce(compte_rendu ->> 'autres_infos', '') || E'\n' || v_line))),
         updated_at = now()
   WHERE id = v_visite AND position(p_lien IN coalesce(compte_rendu ->> 'autres_infos', '')) = 0;
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_lien(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
