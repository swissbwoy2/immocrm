-- Lot 1 (plan d'upscale) : visites réelles, fin des rappels fantômes, CR => visite effectuée, relances régie J+1/J+3/J+7. Appliquée en base le 13.10.2026.
-- Non destructif : aucune suppression, aucune visite passée modifiée.

-- 1. Une visite est-elle réelle ? (mêmes critères que src/lib/visitDecision.ts#isVisiteReelle)
CREATE OR REPLACE FUNCTION public.visite_est_reelle(p_visite_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT v.statut <> 'annulee' AND (
         COALESCE(v.est_deleguee, false)
      OR v.coursier_id IS NOT NULL
      OR v.statut IN ('confirmee','effectuee')
      OR v.source IN ('deleguee','planifiee_client','portail','manuel','manuelle','proposee_agent')
      OR v.client_decision IS NOT NULL
      OR o.statut IN ('interesse','visite_planifiee','visite_confirmee','visite_effectuee','souhaite_postuler','candidature_deposee','acceptee')
    )
    FROM visites v LEFT JOIN offres o ON o.id = v.offre_id
    WHERE v.id = p_visite_id
  ), false);
$$;

-- 2. Compte-rendu envoyé au client => la visite est effectuée
CREATE OR REPLACE FUNCTION public.vcr_marque_visite_effectuee()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visite_id IS NOT NULL AND NEW.envoye_au_client_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.envoye_au_client_at IS NULL) THEN
    UPDATE visites
       SET statut = 'effectuee'
     WHERE id = NEW.visite_id
       AND statut IN ('planifiee','confirmee','proposee')
       AND date_visite <= now() + interval '2 hours'
       AND public.visite_est_reelle(id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vcr_marque_visite_effectuee ON public.visite_comptes_rendus;
CREATE TRIGGER trg_vcr_marque_visite_effectuee
AFTER INSERT OR UPDATE OF envoye_au_client_at ON public.visite_comptes_rendus
FOR EACH ROW EXECUTE FUNCTION public.vcr_marque_visite_effectuee();

-- 3. Créneau d'annonce inséré par une routine, client pas encore intéressé : pas de rappel 24h.
--    Marqueur : reminder_24h_sent = true ET reminder_24h_sent_at NULL (= rappel suspendu, pas envoyé).
CREATE OR REPLACE FUNCTION public.visites_creneau_annonce_sans_rappel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offre_statut text;
BEGIN
  IF NEW.source IN ('immobilier.ch','flatfox.ch','homegate.ch','gmail-alerte','facebook','immoscout24.ch','flatfox','homegate','immobilier')
     AND NOT COALESCE(NEW.est_deleguee, false)
     AND NEW.statut = 'planifiee'
     AND NEW.coursier_id IS NULL
     AND NEW.client_decision IS NULL THEN
    IF NEW.offre_id IS NOT NULL THEN
      SELECT statut INTO v_offre_statut FROM offres WHERE id = NEW.offre_id;
    END IF;
    IF v_offre_statut IS NULL OR v_offre_statut IN ('envoyee','vue') THEN
      NEW.reminder_24h_sent := true;
      NEW.reminder_24h_sent_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visites_creneau_annonce_sans_rappel ON public.visites;
CREATE TRIGGER trg_visites_creneau_annonce_sans_rappel
BEFORE INSERT ON public.visites
FOR EACH ROW EXECUTE FUNCTION public.visites_creneau_annonce_sans_rappel();

-- 4. Le client se dit intéressé => on réactive les rappels suspendus de ses visites à venir
CREATE OR REPLACE FUNCTION public.offres_reactive_rappels_visite()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut
     AND NEW.statut IN ('interesse','visite_planifiee','visite_confirmee') THEN
    UPDATE visites
       SET reminder_24h_sent = false
     WHERE offre_id = NEW.id
       AND statut IN ('planifiee','confirmee')
       AND date_visite > now()
       AND reminder_24h_sent = true
       AND reminder_24h_sent_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offres_reactive_rappels_visite ON public.offres;
CREATE TRIGGER trg_offres_reactive_rappels_visite
AFTER UPDATE OF statut ON public.offres
FOR EACH ROW EXECUTE FUNCTION public.offres_reactive_rappels_visite();

-- 5. Reprise : suspendre les rappels des créneaux fantômes À VENIR (rien n'est supprimé, le passé n'est pas touché)
UPDATE public.visites v
   SET reminder_24h_sent = true
 WHERE v.date_visite > now()
   AND v.statut = 'planifiee'
   AND COALESCE(v.reminder_24h_sent, false) = false
   AND v.reminder_24h_sent_at IS NULL
   AND NOT public.visite_est_reelle(v.id);

-- 6. Relances régie J+1 / J+3 / J+7 après chaque dossier déposé (notification interne admin + agent du client)
CREATE OR REPLACE FUNCTION public.relances_regie_quotidiennes()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  dest uuid;
  n integer := 0;
  v_today date := (now() AT TIME ZONE 'Europe/Zurich')::date;
BEGIN
  FOR r IN
    SELECT ca.id, ca.client_id,
           (v_today - (COALESCE(ca.date_depot, ca.created_at) AT TIME ZONE 'Europe/Zurich')::date) AS age,
           COALESCE(o.adresse, 'un bien') AS adresse,
           COALESCE(NULLIF(trim(COALESCE(p.prenom,'') || ' ' || COALESCE(p.nom,'')), ''), p.email, 'un client') AS client_nom,
           ag.user_id AS agent_user_id
      FROM candidatures ca
      LEFT JOIN offres o   ON o.id = ca.offre_id
      LEFT JOIN clients c  ON c.id = ca.client_id
      LEFT JOIN profiles p ON p.id = c.user_id
      LEFT JOIN agents ag  ON ag.id = c.agent_id
     WHERE ca.statut IN ('en_attente','candidature_deposee','envoyee')
       AND (v_today - (COALESCE(ca.date_depot, ca.created_at) AT TIME ZONE 'Europe/Zurich')::date) IN (1, 3, 7)
  LOOP
    FOR dest IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
      UNION
      SELECT r.agent_user_id WHERE r.agent_user_id IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications nt
         WHERE nt.user_id = dest AND nt.type = 'relance_regie'
           AND nt.metadata->>'candidature_id' = r.id::text
           AND nt.metadata->>'etape' = ('J+' || r.age)
      ) THEN
        PERFORM create_notification(
          dest, 'relance_regie',
          '📞 Relance régie J+' || r.age,
          'Relancer la gérance pour le dossier de ' || r.client_nom || ' — ' || r.adresse,
          '/admin/candidatures',
          jsonb_build_object('candidature_id', r.id::text, 'etape', 'J+' || r.age)
        );
        n := n + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.relances_regie_quotidiennes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vcr_marque_visite_effectuee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visites_creneau_annonce_sans_rappel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offres_reactive_rappels_visite() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visite_est_reelle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visite_est_reelle(uuid) TO authenticated;

-- 07:00 UTC (08:00/09:00 Zurich), du lundi au vendredi
SELECT cron.unschedule('relances-regie-quotidiennes')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'relances-regie-quotidiennes');
SELECT cron.schedule('relances-regie-quotidiennes', '0 7 * * 1-5', $$SELECT public.relances_regie_quotidiennes();$$);
