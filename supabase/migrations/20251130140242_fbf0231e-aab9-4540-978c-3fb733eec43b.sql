-- Mettre à jour les fonctions de notification pour inclure les admins

-- 1. Mise à jour de notify_on_client_assigned pour notifier les admins
CREATE OR REPLACE FUNCTION public.notify_on_client_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_agent_user_id UUID;
  v_client_name TEXT;
  v_admin_record RECORD;
BEGIN
  -- Only if agent_id changed and is not null
  IF NEW.agent_id IS NOT NULL AND (OLD.agent_id IS NULL OR OLD.agent_id != NEW.agent_id) THEN
    -- Get client name
    SELECT COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_client_name
    FROM profiles p WHERE p.id = NEW.user_id;
    
    -- Get agent user_id
    SELECT user_id INTO v_agent_user_id FROM agents WHERE id = NEW.agent_id;
    
    IF v_agent_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_agent_user_id,
        'client_assigned',
        'Nouveau client assigné',
        v_client_name || ' vous a été assigné',
        '/agent/mes-clients',
        jsonb_build_object('client_id', NEW.id::text)
      );
    END IF;
    
    -- Notify all admins
    FOR v_admin_record IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM create_notification(
        v_admin_record.user_id,
        'client_assigned',
        'Client assigné',
        v_client_name || ' a été assigné à un agent',
        '/admin/clients',
        jsonb_build_object('client_id', NEW.id::text)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Mise à jour de notify_on_new_message pour notifier les admins
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_user_id UUID;
  v_admin_record RECORD;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
  
  IF v_conversation IS NOT NULL THEN
    -- Get sender name
    SELECT COALESCE(prenom || ' ' || nom, email) INTO v_sender_name
    FROM profiles WHERE id = NEW.sender_id::uuid;
    
    -- Determine recipient based on sender_type
    IF NEW.sender_type = 'agent' THEN
      -- Notify client
      SELECT user_id INTO v_recipient_user_id 
      FROM clients WHERE id = v_conversation.client_id::uuid;
      
      IF v_recipient_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_recipient_user_id,
          'new_message',
          'Nouveau message',
          'Message de ' || COALESCE(v_sender_name, 'votre agent'),
          '/client/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END IF;
    ELSIF NEW.sender_type = 'client' THEN
      -- Notify agent
      SELECT user_id INTO v_recipient_user_id 
      FROM agents WHERE id = v_conversation.agent_id::uuid;
      
      IF v_recipient_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_recipient_user_id,
          'new_message',
          'Nouveau message',
          'Message de ' || COALESCE(v_sender_name, 'un client'),
          '/agent/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END IF;
      
      -- Notify all admins for client messages
      FOR v_admin_record IN
        SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        PERFORM create_notification(
          v_admin_record.user_id,
          'new_message',
          'Nouveau message client',
          'Message de ' || COALESCE(v_sender_name, 'un client'),
          '/admin/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Mise à jour de notify_on_new_offer pour notifier les admins
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_client_user_id UUID;
  v_agent_name TEXT;
  v_client_name TEXT;
  v_admin_record RECORD;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
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
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        'new_offer',
        'Nouvelle offre reçue',
        COALESCE('Offre de ' || v_agent_name, 'Nouvelle offre') || ' - ' || NEW.adresse,
        '/client/offres-recues',
        jsonb_build_object('offre_id', NEW.id::text)
      );
    END IF;
    
    -- Notify all admins
    FOR v_admin_record IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM create_notification(
        v_admin_record.user_id,
        'new_offer',
        'Nouvelle offre envoyée',
        COALESCE(v_agent_name, 'Un agent') || ' a envoyé une offre à ' || COALESCE(v_client_name, 'un client') || ' - ' || NEW.adresse,
        '/admin/offres-envoyees',
        jsonb_build_object('offre_id', NEW.id::text)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Mise à jour de notify_on_new_visit pour notifier les admins
CREATE OR REPLACE FUNCTION public.notify_on_new_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_client_user_id UUID;
  v_client_name TEXT;
  v_agent_name TEXT;
  v_admin_record RECORD;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    -- Get client user_id and name
    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email)
    INTO v_client_user_id, v_client_name
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;
    
    -- Get agent name if exists
    IF NEW.agent_id IS NOT NULL THEN
      SELECT COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_agent_name
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.id = NEW.agent_id;
    END IF;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        'new_visit',
        'Nouvelle visite programmée',
        'Visite prévue le ' || to_char(NEW.date_visite, 'DD/MM/YYYY à HH24:MI') || ' - ' || NEW.adresse,
        '/client/visites',
        jsonb_build_object('visite_id', NEW.id::text)
      );
    END IF;
    
    -- Notify all admins
    FOR v_admin_record IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM create_notification(
        v_admin_record.user_id,
        'new_visit',
        'Nouvelle visite programmée',
        COALESCE(v_agent_name, 'Un agent') || ' a programmé une visite pour ' || COALESCE(v_client_name, 'un client') || ' - ' || NEW.adresse,
        '/admin/calendrier',
        jsonb_build_object('visite_id', NEW.id::text)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. Mise à jour de notify_on_client_activated avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.notify_on_client_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_client_record RECORD;
  v_agent_user_id UUID;
  v_admin_record RECORD;
  v_client_name TEXT;
BEGIN
  -- Only trigger when actif changes from false/null to true
  IF NEW.actif = true AND (OLD.actif IS NULL OR OLD.actif = false) THEN
    -- Get client info
    SELECT c.id as client_id, c.agent_id, p.prenom, p.nom, p.email
    INTO v_client_record
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.user_id = NEW.id;
    
    IF v_client_record IS NOT NULL THEN
      v_client_name := COALESCE(v_client_record.prenom || ' ' || v_client_record.nom, v_client_record.email);
      
      -- Notify assigned agent if exists
      IF v_client_record.agent_id IS NOT NULL THEN
        SELECT user_id INTO v_agent_user_id FROM agents WHERE id = v_client_record.agent_id;
        
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_agent_user_id,
            'new_client_activated',
            'Nouveau client activé',
            v_client_name || ' a activé son compte',
            '/agent/mes-clients',
            jsonb_build_object('client_id', v_client_record.client_id::text)
          );
        END IF;
      END IF;
      
      -- Notify all admins
      FOR v_admin_record IN
        SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        PERFORM create_notification(
          v_admin_record.user_id,
          'new_client_activated',
          'Nouveau client activé',
          v_client_name || ' a activé son compte',
          '/admin/clients',
          jsonb_build_object('client_id', v_client_record.client_id::text)
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;