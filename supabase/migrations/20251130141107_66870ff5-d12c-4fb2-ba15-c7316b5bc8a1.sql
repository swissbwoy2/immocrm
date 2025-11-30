-- Create trigger to send notifications with email on candidature status changes
CREATE OR REPLACE FUNCTION public.notify_on_candidature_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id UUID;
  v_agent_user_id UUID;
  v_offre_adresse TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT;
  v_notification_link TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    
    -- Get client user_id and offer address
    SELECT c.user_id, o.adresse INTO v_client_user_id, v_offre_adresse
    FROM clients c
    JOIN offres o ON o.id = NEW.offre_id
    WHERE c.id = NEW.client_id;
    
    -- Get agent user_id
    SELECT a.user_id INTO v_agent_user_id
    FROM agents a
    JOIN clients c ON c.agent_id = a.id
    WHERE c.id = NEW.client_id;
    
    -- Determine notification based on new status
    CASE NEW.statut
      WHEN 'acceptee' THEN
        v_notification_title := '🎉 Candidature acceptée !';
        v_notification_message := 'Votre candidature pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été acceptée !';
        v_notification_type := 'candidature_acceptee';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'refusee' THEN
        v_notification_title := 'Candidature refusée';
        v_notification_message := 'Votre candidature pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' n''a pas été retenue.';
        v_notification_type := 'candidature_refusee';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'bail_conclu' THEN
        v_notification_title := '📋 Confirmation reçue';
        v_notification_message := 'Votre confirmation pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été enregistrée. Votre agent valide avec la régie.';
        v_notification_type := 'candidature_bail_conclu';
        v_notification_link := '/client/mes-candidatures';
        
        -- Also notify agent when client accepts bail
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_agent_user_id,
            'bail_conclu',
            '🎉 Client accepte de conclure le bail',
            'Le client souhaite conclure le bail pour ' || COALESCE(v_offre_adresse, 'ce bien'),
            '/agent/candidatures',
            jsonb_build_object('candidature_id', NEW.id::text)
          );
        END IF;
        
      WHEN 'attente_bail' THEN
        v_notification_title := '⏳ Validation régie en cours';
        v_notification_message := 'Votre agent valide votre dossier auprès de la régie pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_attente_bail';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'bail_recu' THEN
        v_notification_title := '📄 Bail reçu - Choisissez votre date';
        v_notification_message := 'Le bail est prêt ! Choisissez une date de signature pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_bail_recu';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'signature_planifiee' THEN
        v_notification_title := '📅 Date de signature confirmée';
        v_notification_message := 'La date de signature a été confirmée pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_signature_planifiee';
        v_notification_link := '/client/mes-candidatures';
        
        -- Also notify agent when client chooses signature date
        IF v_agent_user_id IS NOT NULL AND NEW.date_signature_choisie IS NOT NULL THEN
          PERFORM create_notification(
            v_agent_user_id,
            'date_signature_choisie',
            '📅 Date de signature choisie',
            'Le client a choisi une date de signature pour ' || COALESCE(v_offre_adresse, 'ce bien'),
            '/agent/candidatures',
            jsonb_build_object('candidature_id', NEW.id::text)
          );
        END IF;
        
      WHEN 'signature_effectuee' THEN
        v_notification_title := '✅ Bail signé !';
        v_notification_message := 'Le bail pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été signé. En attente de la date d''état des lieux.';
        v_notification_type := 'candidature_signature_effectuee';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'etat_lieux_fixe' THEN
        v_notification_title := '🔑 État des lieux fixé';
        v_notification_message := 'La date de l''état des lieux pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été fixée.';
        v_notification_type := 'candidature_etat_lieux_fixe';
        v_notification_link := '/client/mes-candidatures';
        
      WHEN 'cles_remises' THEN
        v_notification_title := '🏠 Bienvenue chez vous !';
        v_notification_message := 'Les clés de ' || COALESCE(v_offre_adresse, 'ce bien') || ' vous ont été remises. Félicitations !';
        v_notification_type := 'candidature_cles_remises';
        v_notification_link := '/client/mes-candidatures';
        
      ELSE
        -- No notification for other statuses
        RETURN NEW;
    END CASE;
    
    -- Send notification to client (with email via create_notification)
    IF v_client_user_id IS NOT NULL AND v_notification_title IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        v_notification_type,
        v_notification_title,
        v_notification_message,
        v_notification_link,
        jsonb_build_object('candidature_id', NEW.id::text, 'offre_adresse', v_offre_adresse)
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on candidatures table
DROP TRIGGER IF EXISTS trigger_candidature_status_notification ON candidatures;
CREATE TRIGGER trigger_candidature_status_notification
  AFTER UPDATE ON candidatures
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_candidature_status_change();

-- Also create trigger for visit confirmation/refusal notifications
CREATE OR REPLACE FUNCTION public.notify_on_visite_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id UUID;
  v_visite_date TIMESTAMP;
  v_visite_adresse TEXT;
BEGIN
  -- Only trigger on status change for delegated visits
  IF OLD.statut IS DISTINCT FROM NEW.statut AND NEW.est_deleguee = true THEN
    
    -- Get client user_id
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    v_visite_date := NEW.date_visite;
    v_visite_adresse := NEW.adresse;
    
    IF v_client_user_id IS NOT NULL THEN
      IF NEW.statut = 'confirmee' THEN
        PERFORM create_notification(
          v_client_user_id,
          'visit_confirmed',
          '✅ Visite déléguée confirmée',
          'Votre agent a confirmé la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien') || ' pour le ' || to_char(v_visite_date, 'DD/MM/YYYY à HH24:MI'),
          '/client/visites-deleguees',
          jsonb_build_object('visite_id', NEW.id::text)
        );
      ELSIF NEW.statut = 'refusee' THEN
        PERFORM create_notification(
          v_client_user_id,
          'visit_refused',
          '❌ Visite déléguée non disponible',
          'Votre agent n''est pas disponible pour la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien'),
          '/client/visites-deleguees',
          jsonb_build_object('visite_id', NEW.id::text)
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on visites table
DROP TRIGGER IF EXISTS trigger_visite_status_notification ON visites;
CREATE TRIGGER trigger_visite_status_notification
  AFTER UPDATE ON visites
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_visite_status_change();