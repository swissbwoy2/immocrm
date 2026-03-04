
CREATE OR REPLACE FUNCTION public.notify_on_new_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_client_name TEXT;
  v_client_email TEXT;
  v_agent_name TEXT;
  v_agent_email TEXT;
  v_admin_record RECORD;
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E';
  v_base_url TEXT := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-calendar-invite';
  v_headers JSONB;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', v_anon_key,
    'Authorization', 'Bearer ' || v_anon_key
  );

  -- Calculate end date (1 hour after start)
  v_end_date := NEW.date_visite + interval '1 hour';

  IF NEW.client_id IS NOT NULL THEN
    -- Get client user_id, name and email
    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email), p.email
    INTO v_client_user_id, v_client_name, v_client_email
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;
    
    -- Get agent name and email if exists
    IF NEW.agent_id IS NOT NULL THEN
      SELECT COALESCE(p.prenom || ' ' || p.nom, p.email), p.email 
      INTO v_agent_name, v_agent_email
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.id = NEW.agent_id;
    END IF;
    
    -- Notify client (in-app)
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        'new_visit',
        'Nouvelle visite programmée',
        'Visite prévue le ' || to_char(NEW.date_visite, 'DD/MM/YYYY à HH24:MI') || ' - ' || NEW.adresse,
        '/client/visites?visiteId=' || NEW.id,
        jsonb_build_object('visite_id', NEW.id::text)
      );
    END IF;
    
    -- Notify all admins (in-app)
    FOR v_admin_record IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM create_notification(
        v_admin_record.user_id,
        'new_visit_admin',
        '📅 Nouvelle visite programmée',
        COALESCE(v_agent_name, 'Un agent') || ' a programmé une visite pour ' || COALESCE(v_client_name, 'un client') || ' - ' || NEW.adresse,
        '/admin/calendrier?visiteId=' || NEW.id,
        jsonb_build_object('visite_id', NEW.id::text, 'agent_name', v_agent_name, 'client_name', v_client_name)
      );
    END LOOP;

    -- === SEND ICS CALENDAR INVITES VIA EMAIL ===

    -- Send ICS to client
    IF v_client_email IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := v_base_url,
          headers := v_headers,
          body := jsonb_build_object(
            'title', 'Visite - ' || COALESCE(NEW.adresse, 'Adresse inconnue'),
            'description', 'Visite programmée avec ' || COALESCE(v_agent_name, 'votre agent'),
            'location', COALESCE(NEW.adresse, ''),
            'start_date', NEW.date_visite::text,
            'end_date', v_end_date::text,
            'all_day', false,
            'recipient_email', v_client_email
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send ICS to client %: %', v_client_email, SQLERRM;
      END;
    END IF;

    -- Send ICS to agent
    IF v_agent_email IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := v_base_url,
          headers := v_headers,
          body := jsonb_build_object(
            'title', 'Visite - ' || COALESCE(NEW.adresse, 'Adresse inconnue'),
            'description', 'Visite avec ' || COALESCE(v_client_name, 'un client'),
            'location', COALESCE(NEW.adresse, ''),
            'start_date', NEW.date_visite::text,
            'end_date', v_end_date::text,
            'all_day', false,
            'recipient_email', v_agent_email
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send ICS to agent %: %', v_agent_email, SQLERRM;
      END;
    END IF;

    -- Send ICS to all admins
    FOR v_admin_record IN
      SELECT p.email 
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin' AND p.email IS NOT NULL
    LOOP
      BEGIN
        PERFORM net.http_post(
          url := v_base_url,
          headers := v_headers,
          body := jsonb_build_object(
            'title', 'Visite - ' || COALESCE(NEW.adresse, 'Adresse inconnue'),
            'description', COALESCE(v_agent_name, 'Un agent') || ' - Visite avec ' || COALESCE(v_client_name, 'un client'),
            'location', COALESCE(NEW.adresse, ''),
            'start_date', NEW.date_visite::text,
            'end_date', v_end_date::text,
            'all_day', false,
            'recipient_email', v_admin_record.email
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send ICS to admin %: %', v_admin_record.email, SQLERRM;
      END;
    END LOOP;

  END IF;
  
  RETURN NEW;
END;
$function$;
