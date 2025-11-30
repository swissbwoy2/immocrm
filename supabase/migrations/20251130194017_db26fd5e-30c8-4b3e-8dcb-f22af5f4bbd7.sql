-- Add mandate conclusion goal
INSERT INTO public.default_agent_goals (title, description, goal_type, target_min, target_max, period) VALUES
('Conclure un mandat', 'Conclure un mandat client en moins de 45 jours', 'transactions', 1, 3, 'monthly');

-- Add speed-based badge categories for fast mandate conclusions
ALTER TABLE public.agent_badges 
DROP CONSTRAINT IF EXISTS agent_badges_badge_category_check;

ALTER TABLE public.agent_badges 
ADD CONSTRAINT agent_badges_badge_category_check 
CHECK (badge_category IN ('offres', 'visites', 'candidatures', 'transactions', 'commissions', 'streak', 'special', 'speed'));

-- Update the badge function to include notifications and speed badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
  v_agent_user_id UUID;
  v_count INTEGER;
  v_badge_exists BOOLEAN;
  v_badge_id UUID;
  v_days_to_close INTEGER;
  v_client_date_ajout TIMESTAMP;
BEGIN
  -- Get agent_id based on the table
  IF TG_TABLE_NAME = 'offres' THEN
    v_agent_id := NEW.agent_id;
  ELSIF TG_TABLE_NAME = 'visites' THEN
    v_agent_id := NEW.agent_id;
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    v_agent_id := NEW.agent_id;
  ELSIF TG_TABLE_NAME = 'candidatures' THEN
    SELECT agent_id INTO v_agent_id FROM clients WHERE id = NEW.client_id;
  END IF;

  IF v_agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get agent user_id for notifications
  SELECT user_id INTO v_agent_user_id FROM agents WHERE id = v_agent_id;

  -- Check for offer milestones
  IF TG_TABLE_NAME = 'offres' THEN
    SELECT COUNT(*) INTO v_count FROM offres WHERE agent_id = v_agent_id;
    
    -- Bronze: 10 offers
    IF v_count >= 10 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'bronze' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'bronze', 'offres', 'Premiers pas', '10 offres envoyées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        -- Create notification
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥉 Nouveau badge débloqué !', 'Vous avez obtenu le badge "Premiers pas" - 10 offres envoyées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'bronze'));
        END IF;
      END IF;
    END IF;
    
    -- Silver: 50 offers
    IF v_count >= 50 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'offres', 'Chasseur actif', '50 offres envoyées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥈 Nouveau badge débloqué !', 'Vous avez obtenu le badge "Chasseur actif" - 50 offres envoyées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'silver'));
        END IF;
      END IF;
    END IF;
    
    -- Gold: 100 offers
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'offres', 'Expert en offres', '100 offres envoyées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥇 Nouveau badge débloqué !', 'Vous avez obtenu le badge "Expert en offres" - 100 offres envoyées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'gold'));
        END IF;
      END IF;
    END IF;
    
    -- Trophy: 500 offers
    IF v_count >= 500 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'trophy' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'trophy', 'offres', 'Maître des offres', '500 offres envoyées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🏆 Nouveau badge débloqué !', 'Vous avez obtenu le badge "Maître des offres" - 500 offres envoyées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'trophy'));
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check for transaction milestones and speed badges
  IF TG_TABLE_NAME = 'transactions' AND NEW.statut = 'conclue' THEN
    SELECT COUNT(*) INTO v_count FROM transactions WHERE agent_id = v_agent_id AND statut = 'conclue';
    
    -- Calculate days to close for speed badge
    IF NEW.client_id IS NOT NULL THEN
      SELECT date_ajout INTO v_client_date_ajout FROM clients WHERE id = NEW.client_id;
      IF v_client_date_ajout IS NOT NULL THEN
        v_days_to_close := EXTRACT(DAY FROM (NEW.date_transaction - v_client_date_ajout));
        
        -- Speed badges based on closure time
        IF v_days_to_close <= 15 THEN
          -- Legend: Under 15 days
          SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'legend' AND badge_category = 'speed' AND (metadata->>'client_id')::text = NEW.client_id::text) INTO v_badge_exists;
          IF NOT v_badge_exists THEN
            INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
            VALUES (v_agent_id, 'legend', 'speed', 'Éclair ⚡', 'Mandat conclu en moins de 15 jours !', jsonb_build_object('days', v_days_to_close, 'client_id', NEW.client_id::text))
            RETURNING id INTO v_badge_id;
            IF v_agent_user_id IS NOT NULL THEN
              PERFORM create_notification(v_agent_user_id, 'badge_earned', '⚡ LÉGENDAIRE ! Badge débloqué !', 'Incroyable ! Mandat conclu en ' || v_days_to_close || ' jours ! Badge "Éclair" obtenu !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'legend'));
            END IF;
          END IF;
        ELSIF v_days_to_close <= 30 THEN
          -- Champion: Under 30 days
          SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'champion' AND badge_category = 'speed' AND (metadata->>'client_id')::text = NEW.client_id::text) INTO v_badge_exists;
          IF NOT v_badge_exists THEN
            INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
            VALUES (v_agent_id, 'champion', 'speed', 'Turbo 🚀', 'Mandat conclu en moins de 30 jours !', jsonb_build_object('days', v_days_to_close, 'client_id', NEW.client_id::text))
            RETURNING id INTO v_badge_id;
            IF v_agent_user_id IS NOT NULL THEN
              PERFORM create_notification(v_agent_user_id, 'badge_earned', '🚀 Champion ! Badge débloqué !', 'Excellent ! Mandat conclu en ' || v_days_to_close || ' jours ! Badge "Turbo" obtenu !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'champion'));
            END IF;
          END IF;
        ELSIF v_days_to_close <= 45 THEN
          -- Gold: Under 45 days
          SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'speed' AND (metadata->>'client_id')::text = NEW.client_id::text) INTO v_badge_exists;
          IF NOT v_badge_exists THEN
            INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
            VALUES (v_agent_id, 'gold', 'speed', 'Rapide 🏃', 'Mandat conclu en moins de 45 jours !', jsonb_build_object('days', v_days_to_close, 'client_id', NEW.client_id::text))
            RETURNING id INTO v_badge_id;
            IF v_agent_user_id IS NOT NULL THEN
              PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥇 Badge débloqué !', 'Bravo ! Mandat conclu en ' || v_days_to_close || ' jours ! Badge "Rapide" obtenu !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'gold'));
            END IF;
          END IF;
        ELSIF v_days_to_close <= 60 THEN
          -- Silver: Under 60 days
          SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'speed' AND (metadata->>'client_id')::text = NEW.client_id::text) INTO v_badge_exists;
          IF NOT v_badge_exists THEN
            INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
            VALUES (v_agent_id, 'silver', 'speed', 'Efficace 💼', 'Mandat conclu en moins de 60 jours', jsonb_build_object('days', v_days_to_close, 'client_id', NEW.client_id::text))
            RETURNING id INTO v_badge_id;
            IF v_agent_user_id IS NOT NULL THEN
              PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥈 Badge débloqué !', 'Bien joué ! Mandat conclu en ' || v_days_to_close || ' jours ! Badge "Efficace" obtenu !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'silver'));
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- Star: First transaction
    IF v_count >= 1 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'star' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'star', 'transactions', 'Première affaire', 'Première transaction conclue', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '⭐ Félicitations ! Premier badge !', 'Vous avez conclu votre première affaire ! Badge "Première affaire" obtenu !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'star'));
        END IF;
      END IF;
    END IF;
    
    -- Bronze: 5 transactions
    IF v_count >= 5 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'bronze' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'bronze', 'transactions', 'Négociateur confirmé', '5 affaires conclues', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥉 Badge débloqué !', 'Vous avez obtenu le badge "Négociateur confirmé" - 5 affaires conclues !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'bronze'));
        END IF;
      END IF;
    END IF;
    
    -- Silver: 20 transactions
    IF v_count >= 20 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'transactions', 'Closer expert', '20 affaires conclues', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥈 Badge débloqué !', 'Vous avez obtenu le badge "Closer expert" - 20 affaires conclues !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'silver'));
        END IF;
      END IF;
    END IF;
    
    -- Gold: 50 transactions
    IF v_count >= 50 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'transactions', 'Champion des ventes', '50 affaires conclues', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥇 Badge débloqué !', 'Vous avez obtenu le badge "Champion des ventes" - 50 affaires conclues !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'gold'));
        END IF;
      END IF;
    END IF;
    
    -- Trophy: 100 transactions
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'trophy' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'trophy', 'transactions', 'Légende Immo-Rama', '100 affaires conclues', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🏆 LÉGENDAIRE ! Badge débloqué !', 'Vous avez obtenu le badge "Légende Immo-Rama" - 100 affaires conclues !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'trophy'));
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check for visit milestones
  IF TG_TABLE_NAME = 'visites' THEN
    SELECT COUNT(*) INTO v_count FROM visites WHERE agent_id = v_agent_id;
    
    -- Bronze: 25 visits
    IF v_count >= 25 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'bronze' AND badge_category = 'visites') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'bronze', 'visites', 'Explorateur', '25 visites effectuées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥉 Badge débloqué !', 'Vous avez obtenu le badge "Explorateur" - 25 visites effectuées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'bronze'));
        END IF;
      END IF;
    END IF;
    
    -- Silver: 100 visits
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'visites') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'visites', 'Guide immobilier', '100 visites effectuées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥈 Badge débloqué !', 'Vous avez obtenu le badge "Guide immobilier" - 100 visites effectuées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'silver'));
        END IF;
      END IF;
    END IF;
    
    -- Gold: 250 visits
    IF v_count >= 250 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'visites') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'visites', 'Maître des visites', '250 visites effectuées', jsonb_build_object('count', v_count))
        RETURNING id INTO v_badge_id;
        IF v_agent_user_id IS NOT NULL THEN
          PERFORM create_notification(v_agent_user_id, 'badge_earned', '🥇 Badge débloqué !', 'Vous avez obtenu le badge "Maître des visites" - 250 visites effectuées !', '/agent', jsonb_build_object('badge_id', v_badge_id::text, 'badge_type', 'gold'));
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;