-- Steeve côté client : déléguer une visite, confirmer sa présence, s'inscrire à une visite groupée Flatfox
-- (demande de l'admin du 26.10.2026 : « il manque des outils »). Exécuté pour CE client uniquement (service).
-- Mêmes règles que l'application : la délégation consomme un crédit de visite (sauf parcours achat), refusée si le
-- mandat est en suspens ; une visite déléguée datée est publiée aux coursiers ; sans date, Steeve demande une date à
-- l'annonceur et la visite déléguée attend cette date (la confirmation de l'annonceur la complète).
-- Additive et idempotente.

CREATE OR REPLACE FUNCTION public.steeve_client_deleguer_visite(p_client_id uuid, p_offre_id uuid, p_date timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  c record;
  v_achat boolean;
  v_coins integer;
  v_visite uuid;
  v_dem jsonb;
BEGIN
  SELECT id, statut, adresse INTO o FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable dans ton dossier.');
  END IF;
  IF o.statut IN ('refusee', 'doublon', 'candidature_deposee', 'acceptee') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Pas de visite possible pour cette offre (' || o.statut || ').');
  END IF;
  IF p_date IS NOT NULL AND p_date < now() + interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Date passée ou trop proche (au moins 2 h à l''avance).');
  END IF;
  -- Déjà déléguée (visite à venir, ou demande de date marquée « déléguée ») : rien en double, aucun crédit consommé.
  SELECT id INTO v_visite FROM public.visites
   WHERE offre_id = p_offre_id AND client_id = p_client_id AND est_deleguee AND coalesce(statut, '') NOT IN ('annulee', 'effectuee')
     AND date_visite > now() LIMIT 1;
  IF v_visite IS NOT NULL OR EXISTS (SELECT 1 FROM public.steeve_actions a WHERE a.kind = 'demande_visite' AND a.offre_id = p_offre_id
                                       AND a.client_id = p_client_id AND a.note LIKE 'Visite déléguée%' AND a.statut NOT IN ('annule', 'echec')) THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'visite_id', v_visite, 'bien', o.adresse);
  END IF;
  SELECT cl.id, cl.user_id, cl.agent_id, cl.journey_type, cl.type_recherche INTO c FROM public.clients cl WHERE cl.id = p_client_id;
  IF EXISTS (SELECT 1 FROM public.user_credits uc WHERE uc.user_id = c.user_id AND uc.mandat_statut = 'suspendu') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Ton mandat est en suspens : renouvelle-le depuis ton tableau de bord pour déléguer une visite.');
  END IF;
  v_achat := coalesce(c.journey_type, c.type_recherche, '') IN ('purchase_search', 'achat', 'Acheter')
             OR EXISTS (SELECT 1 FROM public.purchase_projects pp WHERE pp.client_id = p_client_id);
  IF NOT v_achat THEN
    UPDATE public.user_credits SET coins_visite = coins_visite - 1
     WHERE user_id = c.user_id AND coins_visite > 0 RETURNING coins_visite INTO v_coins;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motif', 'Plus de crédit de visite déléguée : tu peux en racheter depuis ton espace, ou visiter toi-même (je demande la visite).');
    END IF;
  END IF;

  IF p_date IS NOT NULL THEN
    -- Créneau connu : visite déléguée publiée aux coursiers.
    SELECT id INTO v_visite FROM public.visites
     WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') <> 'annulee' AND (date_visite IS NULL OR date_visite > now())
     ORDER BY date_visite NULLS FIRST LIMIT 1;
    IF v_visite IS NULL THEN
      INSERT INTO public.visites (offre_id, client_id, agent_id, adresse, date_visite, statut, est_deleguee, source, notes, statut_coursier, coursier_id)
      VALUES (p_offre_id, p_client_id, coalesce(c.agent_id, 'ca53c5a5-6a41-4216-a93b-4d3238ad13a6'), o.adresse, p_date, 'planifiee', true, 'deleguee',
              'Visite déléguée par le client (via Steeve)' || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'en_attente', NULL)
      RETURNING id INTO v_visite;
    ELSE
      UPDATE public.visites SET date_visite = p_date, statut = 'planifiee', est_deleguee = true, statut_coursier = 'en_attente', coursier_id = NULL, updated_at = now()
       WHERE id = v_visite;
    END IF;
  ELSE
    -- Visite à venir déjà fixée : elle devient déléguée.
    SELECT id INTO v_visite FROM public.visites
     WHERE offre_id = p_offre_id AND client_id = p_client_id AND coalesce(statut, '') NOT IN ('annulee', 'effectuee') AND date_visite > now()
     ORDER BY date_visite LIMIT 1;
    IF v_visite IS NOT NULL THEN
      UPDATE public.visites SET est_deleguee = true, statut_coursier = 'en_attente', coursier_id = NULL, updated_at = now() WHERE id = v_visite;
    ELSE
      -- Pas encore de date : Steeve la demande à l'annonceur, marquée « déléguée » ; à la confirmation de la date,
      -- steeve_apply_visite crée la visite déléguée et la publie aux coursiers.
      v_dem := public.steeve_client_demande_visite(p_client_id, p_offre_id, 'Visite déléguée : notre équipe visitera pour le client.' || coalesce(' ' || nullif(trim(p_note), ''), ''));
      IF (v_dem ->> 'id') IS NOT NULL THEN
        UPDATE public.steeve_actions
           SET note = left('Visite déléguée : notre équipe visitera pour le client.' || coalesce(' ' || nullif(trim(note), ''), ''), 500), updated_at = now()
         WHERE id = (v_dem ->> 'id')::uuid AND coalesce(note, '') NOT LIKE 'Visite déléguée%';
      ELSE
        -- Demande de visite impossible (ex. visite sans date déjà en cours) : le crédit est rendu.
        IF NOT v_achat THEN
          UPDATE public.user_credits SET coins_visite = coins_visite + 1 WHERE user_id = c.user_id;
        END IF;
        RETURN jsonb_build_object('ok', false, 'motif', coalesce(v_dem ->> 'motif', 'Demande de visite impossible pour ce bien.'));
      END IF;
    END IF;
  END IF;
  IF o.statut = 'envoyee' THEN
    UPDATE public.offres SET statut = 'interesse', updated_at = now() WHERE id = p_offre_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite, 'bien', o.adresse, 'date', p_date, 'credits_restants', v_coins,
                            'demande_de_date', v_dem, 'achat', v_achat);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_deleguer_visite(uuid, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_deleguer_visite(uuid, uuid, timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.steeve_client_confirmer_visite(p_client_id uuid, p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT vi.id, vi.date_visite, vi.client_confirme_visite_at, vi.est_deleguee, o.adresse INTO v
    FROM public.visites vi JOIN public.offres o ON o.id = vi.offre_id
   WHERE vi.offre_id = p_offre_id AND vi.client_id = p_client_id AND coalesce(vi.statut, '') NOT IN ('annulee', 'effectuee')
     AND vi.date_visite > now()
   ORDER BY vi.date_visite LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucune visite à venir avec une date pour ce bien.');
  END IF;
  IF v.client_confirme_visite_at IS NULL THEN
    UPDATE public.visites SET client_confirme_visite_at = now(), updated_at = now() WHERE id = v.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'deja', v.client_confirme_visite_at IS NOT NULL, 'bien', v.adresse,
    'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'deleguee', v.est_deleguee);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_confirmer_visite(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_confirmer_visite(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.steeve_client_inscrire_visite(p_client_id uuid, p_offre_id uuid, p_creneau text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_t jsonb;
BEGIN
  SELECT id, adresse, lien_annonce, statut INTO o FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable dans ton dossier.');
  END IF;
  IF coalesce(o.lien_annonce, '') NOT ILIKE '%flatfox.ch%' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Annonce hors Flatfox : utilise une demande de visite.');
  END IF;
  v_t := public.steeve_tache_creer('inscription_visite', 'flatfox', o.id, p_client_id, 'client', 'routine-chrome',
                                   'Inscription à la visite demandée par le client' || coalesce(' — créneau : ' || nullif(trim(p_creneau), ''), ''), NULL);
  UPDATE public.steeve_actions SET corps = left(coalesce(nullif(trim(p_creneau), ''), 'premier créneau disponible'), 300), updated_at = now()
   WHERE id = (v_t ->> 'id')::uuid AND statut IN ('a_faire', 'en_cours');
  IF o.statut = 'envoyee' THEN
    UPDATE public.offres SET statut = 'interesse', updated_at = now() WHERE id = p_offre_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'tache', v_t);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_inscrire_visite(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_inscrire_visite(uuid, uuid, text) TO service_role;

-- Visite confirmée par l'annonceur : si le client l'avait déléguée, elle devient une visite déléguée publiée aux coursiers.
CREATE OR REPLACE FUNCTION public.steeve_apply_visite(p_offre_id uuid, p_client_id uuid, p_date timestamp with time zone, p_fin timestamp with time zone, p_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offre record;
  v_visite uuid;
  v_conflit boolean;
  v_deleguee boolean;
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
  v_deleguee := EXISTS (SELECT 1 FROM public.steeve_actions a WHERE a.kind = 'demande_visite' AND a.offre_id = p_offre_id
                          AND a.client_id = p_client_id AND a.note LIKE 'Visite déléguée%' AND a.statut NOT IN ('annule', 'echec'));
  IF v_visite IS NULL THEN
    INSERT INTO public.visites (offre_id, client_id, agent_id, date_visite, date_visite_fin, adresse, statut, source, est_deleguee, statut_coursier)
    VALUES (p_offre_id, p_client_id, 'ca53c5a5-6a41-4216-a93b-4d3238ad13a6', p_date, p_fin, v_offre.adresse, 'planifiee', left(p_source, 40),
            v_deleguee, CASE WHEN v_deleguee THEN 'en_attente' END)
    RETURNING id INTO v_visite;
  ELSE
    UPDATE public.visites SET date_visite = p_date, date_visite_fin = p_fin, statut = 'planifiee', updated_at = now(),
           est_deleguee = est_deleguee OR v_deleguee,
           statut_coursier = CASE WHEN v_deleguee AND statut_coursier IS NULL THEN 'en_attente' ELSE statut_coursier END
     WHERE id = v_visite;
  END IF;
  PERFORM public.steeve_set_note(p_offre_id, 'Visite fixée au ' || v_label || ', confirmée par l''annonceur.');
  UPDATE public.contacts_annonceurs SET reponse_le = now(), statut = 'repondu', updated_at = now()
   WHERE offre_id = p_offre_id AND reponse_le IS NULL;
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite, 'adresse', v_offre.adresse, 'quand', v_label, 'deleguee', v_deleguee,
    'message_requis', v_offre.statut IN ('interesse', 'visite_planifiee', 'souhaite_postuler'));
END;
$function$;
