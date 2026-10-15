-- 15.10.2026 — appliquée en base le 15.10.2026 (copie pour l'historique du dépôt).
-- 1) Messagerie : uniquement les échanges client ↔ admin/agent.
--    Offres auto, actions client (intéressé, refus, délégation…), comptes rendus et rappels sont masqués
--    de la messagerie (rien n'est supprimé) et passent par les notifications.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS masque_messagerie boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.message_est_automatique(p_sender_type text, p_content text, p_payload jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT
    coalesce(p_sender_type,'') = 'system'
    OR coalesce(p_payload ? 'campaign_key', false)
    OR coalesce(p_payload->>'source','') IN ('compte_rendu','offre_auto','systeme','notification')
    OR coalesce(p_content,'') LIKE '%[BOUTON\_%'
    OR coalesce(p_content,'') ~ '^\s*(Nouvelle Offre pour Votre Recherche|🏠 Nouvelle offre —|✅ Le client est intéressé|❌ Le client a refusé|✅ Après visionnage|❌ Après visionnage|🎥 Vidéo de la visite|📋 Compte-rendu de la visite|📋 Progression de la candidature|📅 J''ai planifié une visite|📅 J''ai choisi la date|✅ Je suis intéressé\(e\) par cette offre|❌ Cette offre ne correspond pas)'
    OR coalesce(p_content,'') ~ '^\s*[^[:alnum:][:space:]]{1,4}\s*\*\*'
$$;

CREATE OR REPLACE FUNCTION public.messages_classer_automatique()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.masque_messagerie THEN RETURN NEW; END IF;
  IF public.message_est_automatique(NEW.sender_type, NEW.content, NEW.payload) THEN
    NEW.masque_messagerie := true;
  ELSIF NEW.attachment_url IS NOT NULL AND NEW.sender_type IN ('agent','admin') AND EXISTS (
      SELECT 1 FROM public.messages m
       WHERE m.conversation_id = NEW.conversation_id
         AND m.created_at > now() - interval '3 minutes'
         AND m.content ~ '^\s*(📋 Compte-rendu de la visite|🎥 Vidéo de la visite)') THEN
    NEW.masque_messagerie := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_classer_automatique ON public.messages;
CREATE TRIGGER trg_messages_classer_automatique BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_classer_automatique();

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.masque_messagerie THEN RETURN NEW; END IF;
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- notify_on_new_message : les messages masqués n'envoient plus « Nouveau message » ;
-- une action client devient une notification « client_action » (agents + admins),
-- un compte-rendu devient une notification « compte_rendu_visite » au client (lien /client/visites).
-- (corps complet appliqué en base ; voir pg_get_functiondef('public.notify_on_new_message()'))

-- Reprise appliquée une seule fois : UPDATE messages SET masque_messagerie = true pour les messages
-- automatiques existants (11 791) et les médias joints aux comptes rendus (153).

-- 2) Postuler uniquement après une visite réellement faite.
--    public.visite_permet_postuler(visite) + request_postulation durci (corps complet appliqué en base).
--    Reprise unique : 126 offres « souhaite_postuler » sans visite repassées en « interesse »,
--    liste conservée dans public.reprise_postuler_sans_visite_20261015 (notifications coupées pendant la reprise).

-- 3) Suivi des offres auto regroupé par annonce : public.offre_groupe_cle(lien, adresse)
--    et public.offres_auto_groupes(...) (SECURITY INVOKER, RLS appliquée).
