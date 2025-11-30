-- Recreate notify_on_new_offer function to properly notify admins
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    
    -- Notify client
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
        'new_offer_admin',
        '📬 Nouvelle offre envoyée',
        COALESCE(v_agent_name, 'Un agent') || ' a envoyé une offre à ' || COALESCE(v_client_name, 'un client') || ' - ' || NEW.adresse,
        '/admin/offres-envoyees',
        jsonb_build_object('offre_id', NEW.id::text, 'agent_name', v_agent_name, 'client_name', v_client_name)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate notify_on_new_visit function to properly notify admins
CREATE OR REPLACE FUNCTION public.notify_on_new_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    
    -- Notify client
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
        'new_visit_admin',
        '📅 Nouvelle visite programmée',
        COALESCE(v_agent_name, 'Un agent') || ' a programmé une visite pour ' || COALESCE(v_client_name, 'un client') || ' - ' || NEW.adresse,
        '/admin/calendrier',
        jsonb_build_object('visite_id', NEW.id::text, 'agent_name', v_agent_name, 'client_name', v_client_name)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate notify_on_visite_status_change to notify admins for delegated visits
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

-- Ensure triggers exist on the tables
DROP TRIGGER IF EXISTS on_new_offer ON offres;
CREATE TRIGGER on_new_offer
  AFTER INSERT ON offres
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_offer();

DROP TRIGGER IF EXISTS on_new_visit ON visites;
CREATE TRIGGER on_new_visit
  AFTER INSERT ON visites
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_visit();

DROP TRIGGER IF EXISTS on_visite_status_change ON visites;
CREATE TRIGGER on_visite_status_change
  AFTER UPDATE ON visites
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_visite_status_change();