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

  v_end_date := NEW.date_visite + interval '1 hour';

  IF NEW.client_id IS NOT NULL THEN
    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email), p.email
    INTO v_client_user_id, v_client_name, v_client_email
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;

    IF NEW.agent_id IS NOT NULL THEN
      SELECT COALESCE(p.prenom || ' ' || p.nom, p.email), p.email
      INTO v_agent_name, v_agent_email
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.id = NEW.agent_id;
    END IF;

    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        'new_visit',
        'Nouvelle visite programmée',
        'Visite prévue le ' || to_char(NEW.date_visite AT TIME ZONE 'Europe/Zurich', 'DD/MM/YYYY à HH24:MI') || ' - ' || NEW.adresse,
        '/client/visites?visiteId=' || NEW.id,
        jsonb_build_object('visite_id', NEW.id::text)
      );
    END IF;

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
  v_visite_date TIMESTAMPTZ;
  v_visite_adresse TEXT;
  v_admin_record RECORD;
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut AND NEW.est_deleguee = true THEN

    SELECT c.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email)
    INTO v_client_user_id, v_client_name
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;

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
        PERFORM create_notification(
          v_client_user_id,
          'visit_confirmed',
          '✅ Visite déléguée confirmée',
          'Votre agent a confirmé la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien') || ' pour le ' || to_char(v_visite_date AT TIME ZONE 'Europe/Zurich', 'DD/MM/YYYY à HH24:MI'),
          '/client/visites-deleguees?visiteId=' || NEW.id,
          jsonb_build_object('visite_id', NEW.id::text)
        );

        FOR v_admin_record IN
          SELECT user_id FROM user_roles WHERE role = 'admin'
        LOOP
          PERFORM create_notification(
            v_admin_record.user_id,
            'visit_confirmed_admin',
            '✅ Visite déléguée confirmée',
            COALESCE(v_agent_name, 'Un agent') || ' a confirmé la visite déléguée de ' || COALESCE(v_client_name, 'un client') || ' au ' || COALESCE(v_visite_adresse, 'un bien'),
            '/admin/calendrier?visiteId=' || NEW.id,
            jsonb_build_object('visite_id', NEW.id::text, 'client_name', v_client_name, 'agent_name', v_agent_name)
          );
        END LOOP;

      ELSIF NEW.statut = 'refusee' THEN
        PERFORM create_notification(
          v_client_user_id,
          'visit_refused',
          '❌ Visite déléguée non disponible',
          'Votre agent n''est pas disponible pour la visite du bien au ' || COALESCE(v_visite_adresse, 'ce bien'),
          '/client/visites-deleguees?visiteId=' || NEW.id,
          jsonb_build_object('visite_id', NEW.id::text)
        );

        FOR v_admin_record IN
          SELECT user_id FROM user_roles WHERE role = 'admin'
        LOOP
          PERFORM create_notification(
            v_admin_record.user_id,
            'visit_refused_admin',
            '❌ Visite déléguée refusée',
            COALESCE(v_agent_name, 'Un agent') || ' a refusé la visite déléguée de ' || COALESCE(v_client_name, 'un client') || ' au ' || COALESCE(v_visite_adresse, 'un bien'),
            '/admin/calendrier?visiteId=' || NEW.id,
            jsonb_build_object('visite_id', NEW.id::text, 'client_name', v_client_name, 'agent_name', v_agent_name)
          );
        END LOOP;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;