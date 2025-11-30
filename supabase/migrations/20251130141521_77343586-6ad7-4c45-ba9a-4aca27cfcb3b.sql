-- Update notify_on_candidature_status_change to include admin notifications
CREATE OR REPLACE FUNCTION public.notify_on_candidature_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_agent_user_id UUID;
  v_agent_name TEXT;
  v_client_name TEXT;
  v_offre_adresse TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT;
  v_notification_link TEXT;
  v_admin_title TEXT;
  v_admin_message TEXT;
  v_admin_record RECORD;
BEGIN
  -- Only trigger on status change
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    
    -- Get client user_id, name and offer address
    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email), o.adresse 
    INTO v_client_user_id, v_client_name, v_offre_adresse
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    JOIN offres o ON o.id = NEW.offre_id
    WHERE c.id = NEW.client_id;
    
    -- Get agent user_id and name
    SELECT a.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email) 
    INTO v_agent_user_id, v_agent_name
    FROM agents a
    JOIN profiles p ON p.id = a.user_id
    JOIN clients c ON c.agent_id = a.id
    WHERE c.id = NEW.client_id;
    
    -- Determine notification based on new status
    CASE NEW.statut
      WHEN 'acceptee' THEN
        v_notification_title := '🎉 Candidature acceptée !';
        v_notification_message := 'Votre candidature pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été acceptée !';
        v_notification_type := 'candidature_acceptee';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '✅ Candidature acceptée';
        v_admin_message := COALESCE(v_agent_name, 'Un agent') || ' a accepté la candidature de ' || COALESCE(v_client_name, 'un client') || ' pour ' || COALESCE(v_offre_adresse, 'un bien');
        
      WHEN 'refusee' THEN
        v_notification_title := 'Candidature refusée';
        v_notification_message := 'Votre candidature pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' n''a pas été retenue.';
        v_notification_type := 'candidature_refusee';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '❌ Candidature refusée';
        v_admin_message := COALESCE(v_agent_name, 'Un agent') || ' a refusé la candidature de ' || COALESCE(v_client_name, 'un client') || ' pour ' || COALESCE(v_offre_adresse, 'un bien');
        
      WHEN 'bail_conclu' THEN
        v_notification_title := '📋 Confirmation reçue';
        v_notification_message := 'Votre confirmation pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été enregistrée. Votre agent valide avec la régie.';
        v_notification_type := 'candidature_bail_conclu';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '📋 Client accepte le bail';
        v_admin_message := COALESCE(v_client_name, 'Un client') || ' souhaite conclure le bail pour ' || COALESCE(v_offre_adresse, 'un bien');
        
        -- Also notify agent when client accepts bail
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_agent_user_id,
            'bail_conclu',
            '🎉 Client accepte de conclure le bail',
            COALESCE(v_client_name, 'Le client') || ' souhaite conclure le bail pour ' || COALESCE(v_offre_adresse, 'ce bien'),
            '/agent/candidatures',
            jsonb_build_object('candidature_id', NEW.id::text)
          );
        END IF;
        
      WHEN 'attente_bail' THEN
        v_notification_title := '⏳ Validation régie en cours';
        v_notification_message := 'Votre agent valide votre dossier auprès de la régie pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_attente_bail';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '⏳ Validation régie en cours';
        v_admin_message := COALESCE(v_agent_name, 'Un agent') || ' valide le dossier de ' || COALESCE(v_client_name, 'un client') || ' auprès de la régie';
        
      WHEN 'bail_recu' THEN
        v_notification_title := '📄 Bail reçu - Choisissez votre date';
        v_notification_message := 'Le bail est prêt ! Choisissez une date de signature pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_bail_recu';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '📄 Bail reçu de la régie';
        v_admin_message := 'Bail reçu pour ' || COALESCE(v_client_name, 'un client') || ' - ' || COALESCE(v_offre_adresse, 'un bien');
        
      WHEN 'signature_planifiee' THEN
        v_notification_title := '📅 Date de signature confirmée';
        v_notification_message := 'La date de signature a été confirmée pour ' || COALESCE(v_offre_adresse, 'ce bien') || '.';
        v_notification_type := 'candidature_signature_planifiee';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '📅 Signature planifiée';
        v_admin_message := COALESCE(v_client_name, 'Un client') || ' a choisi une date de signature pour ' || COALESCE(v_offre_adresse, 'un bien');
        
        -- Also notify agent when client chooses signature date
        IF v_agent_user_id IS NOT NULL AND NEW.date_signature_choisie IS NOT NULL THEN
          PERFORM create_notification(
            v_agent_user_id,
            'date_signature_choisie',
            '📅 Date de signature choisie',
            COALESCE(v_client_name, 'Le client') || ' a choisi une date de signature pour ' || COALESCE(v_offre_adresse, 'ce bien'),
            '/agent/candidatures',
            jsonb_build_object('candidature_id', NEW.id::text)
          );
        END IF;
        
      WHEN 'signature_effectuee' THEN
        v_notification_title := '✅ Bail signé !';
        v_notification_message := 'Le bail pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été signé. En attente de la date d''état des lieux.';
        v_notification_type := 'candidature_signature_effectuee';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '✅ Bail signé';
        v_admin_message := COALESCE(v_client_name, 'Un client') || ' a signé le bail pour ' || COALESCE(v_offre_adresse, 'un bien');
        
      WHEN 'etat_lieux_fixe' THEN
        v_notification_title := '🔑 État des lieux fixé';
        v_notification_message := 'La date de l''état des lieux pour ' || COALESCE(v_offre_adresse, 'ce bien') || ' a été fixée.';
        v_notification_type := 'candidature_etat_lieux_fixe';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '🔑 État des lieux fixé';
        v_admin_message := 'État des lieux fixé pour ' || COALESCE(v_client_name, 'un client') || ' - ' || COALESCE(v_offre_adresse, 'un bien');
        
      WHEN 'cles_remises' THEN
        v_notification_title := '🏠 Bienvenue chez vous !';
        v_notification_message := 'Les clés de ' || COALESCE(v_offre_adresse, 'ce bien') || ' vous ont été remises. Félicitations !';
        v_notification_type := 'candidature_cles_remises';
        v_notification_link := '/client/mes-candidatures';
        v_admin_title := '🏠 Clés remises';
        v_admin_message := 'Clés remises à ' || COALESCE(v_client_name, 'un client') || ' pour ' || COALESCE(v_offre_adresse, 'un bien') || ' - Affaire conclue !';
        
      ELSE
        -- No notification for other statuses
        RETURN NEW;
    END CASE;
    
    -- Send notification to client
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
    
    -- Send notification to all admins
    IF v_admin_title IS NOT NULL THEN
      FOR v_admin_record IN
        SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        PERFORM create_notification(
          v_admin_record.user_id,
          v_notification_type || '_admin',
          v_admin_title,
          v_admin_message,
          '/admin/candidatures',
          jsonb_build_object('candidature_id', NEW.id::text, 'client_name', v_client_name, 'agent_name', v_agent_name)
        );
      END LOOP;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update notify_on_visite_status_change to include admin notifications
CREATE OR REPLACE FUNCTION public.notify_on_visite_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_client_name TEXT;
  v_agent_name TEXT;
  v_visite_date TIMESTAMP;
  v_visite_adresse TEXT;
  v_admin_record RECORD;
BEGIN
  -- Only trigger on status change for delegated visits
  IF OLD.statut IS DISTINCT FROM NEW.statut AND NEW.est_deleguee = true THEN
    
    -- Get client user_id and name
    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email) 
    INTO v_client_user_id, v_client_name 
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;
    
    -- Get agent name
    IF NEW.agent_id IS NOT NULL THEN
      SELECT COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_agent_name
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.id = NEW.agent_id;
    END IF;
    
    v_visite_date := NEW.date_visite;
    v_visite_adresse := NEW.adresse;
    
    IF v_client_user_id IS NOT NULL THEN
      IF NEW.statut = 'confirmee' THEN
        -- Notify client
        PERFORM create_notification(
          v_client_user_id,
          'visit_confirmed',
          '✅ Visite déléguée confirmée',
          'Votre agent a confirmé la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien') || ' pour le ' || to_char(v_visite_date, 'DD/MM/YYYY à HH24:MI'),
          '/client/visites-deleguees',
          jsonb_build_object('visite_id', NEW.id::text)
        );
        
        -- Notify all admins
        FOR v_admin_record IN
          SELECT user_id FROM user_roles WHERE role = 'admin'
        LOOP
          PERFORM create_notification(
            v_admin_record.user_id,
            'visit_confirmed_admin',
            '✅ Visite déléguée confirmée',
            COALESCE(v_agent_name, 'Un agent') || ' a confirmé la visite déléguée de ' || COALESCE(v_client_name, 'un client') || ' au ' || COALESCE(v_visite_adresse, 'un bien'),
            '/admin/calendrier',
            jsonb_build_object('visite_id', NEW.id::text, 'client_name', v_client_name, 'agent_name', v_agent_name)
          );
        END LOOP;
        
      ELSIF NEW.statut = 'refusee' THEN
        -- Notify client
        PERFORM create_notification(
          v_client_user_id,
          'visit_refused',
          '❌ Visite déléguée non disponible',
          'Votre agent n''est pas disponible pour la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien'),
          '/client/visites-deleguees',
          jsonb_build_object('visite_id', NEW.id::text)
        );
        
        -- Notify all admins
        FOR v_admin_record IN
          SELECT user_id FROM user_roles WHERE role = 'admin'
        LOOP
          PERFORM create_notification(
            v_admin_record.user_id,
            'visit_refused_admin',
            '❌ Visite déléguée refusée',
            COALESCE(v_agent_name, 'Un agent') || ' a refusé la visite déléguée de ' || COALESCE(v_client_name, 'un client') || ' au ' || COALESCE(v_visite_adresse, 'un bien'),
            '/admin/calendrier',
            jsonb_build_object('visite_id', NEW.id::text, 'client_name', v_client_name, 'agent_name', v_agent_name)
          );
        END LOOP;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;