-- Table des notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function: notify admin and agent when client activates account
CREATE OR REPLACE FUNCTION public.notify_on_client_activated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger on profiles table for client activation
CREATE TRIGGER trigger_notify_client_activated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_activated();

-- Trigger function: notify agent when client is assigned
CREATE OR REPLACE FUNCTION public.notify_on_client_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_user_id UUID;
  v_client_name TEXT;
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on clients table for assignment
CREATE TRIGGER trigger_notify_client_assigned
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_assigned();

-- Trigger function: notify on new message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_user_id UUID;
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- Trigger function: notify client on new offer
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id UUID;
  v_agent_name TEXT;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    -- Get client user_id
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on offres table
CREATE TRIGGER trigger_notify_new_offer
  AFTER INSERT ON public.offres
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_offer();

-- Trigger function: notify on new visit
CREATE OR REPLACE FUNCTION public.notify_on_new_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id UUID;
  v_agent_name TEXT;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    -- Get client user_id
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on visites table
CREATE TRIGGER trigger_notify_new_visit
  AFTER INSERT ON public.visites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_visit();