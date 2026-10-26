-- Visites groupées sur inscription (Flatfox) et validation d'un créneau par l'admin (demande du 26.10.2026).
-- 1) Nouvelle tâche du registre « inscription_visite » (canal flatfox, responsable routine-chrome) : la partie Chrome
--    de la surveillance inscrit le client au créneau sur Flatfox ; la confirmation « Confirmé: Visite … » reçue dans
--    info@ est ensuite lue par Steeve, qui enregistre la visite et prévient le client.
-- 2) admin_steeve_inscrire_visite : l'admin (ou Steeve sur son ordre) demande l'inscription, avec un créneau préféré.
-- 3) admin_steeve_fixer_visite : l'admin valide un créneau précis ; la visite est enregistrée (mêmes contrôles que la
--    lecture des e-mails : date future, pas de conflit à ± 90 min, note de suivi).
-- Réservé aux administrateurs. Additive et idempotente.

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind = ANY (ARRAY[
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier', 'recherche_offres',
  'envoi_piece_regie', 'inscription_visite']));

CREATE OR REPLACE FUNCTION public.admin_steeve_inscrire_visite(p_offre_id uuid, p_creneau text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_t jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, client_id, adresse, lien_annonce, statut INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  IF coalesce(o.lien_annonce, '') NOT ILIKE '%flatfox.ch%' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'annonce hors Flatfox : inscription à faire auprès de la gérance (demande de visite ou appel)');
  END IF;
  v_t := public.steeve_tache_creer('inscription_visite', 'flatfox', o.id, o.client_id, 'admin', 'routine-chrome',
                                   'Inscription à la visite groupée Flatfox' || coalesce(' — créneau souhaité : ' || nullif(trim(p_creneau), ''), ''), auth.uid());
  -- Le créneau souhaité est transmis à la routine Chrome dans le champ corps (lu par steeve_tache_reserver_suivante).
  UPDATE public.steeve_actions SET corps = left(coalesce(nullif(trim(p_creneau), ''), 'premier créneau disponible'), 300), updated_at = now()
   WHERE id = (v_t ->> 'id')::uuid AND statut IN ('a_faire', 'en_cours');
  RETURN jsonb_build_object('ok', true, 'tache', v_t, 'bien', o.adresse, 'client_id', o.client_id,
    'suite', 'La partie Chrome de la surveillance inscrit le client sur Flatfox à son prochain passage (08h, 13h, 18h) ; en mode à blanc elle prépare et alerte sans s''inscrire. La confirmation Flatfox reçue dans info@ enregistre la visite et prévient le client.');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_inscrire_visite(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_inscrire_visite(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_steeve_fixer_visite(p_offre_id uuid, p_debut timestamptz, p_fin timestamptz DEFAULT NULL)
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
  SELECT id, client_id INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  IF p_fin IS NOT NULL AND p_fin <= p_debut THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'heure de fin avant le début');
  END IF;
  RETURN public.steeve_apply_visite(o.id, o.client_id, p_debut, p_fin, 'admin') || jsonb_build_object('client_id', o.client_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_fixer_visite(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_fixer_visite(uuid, timestamptz, timestamptz) TO authenticated;
