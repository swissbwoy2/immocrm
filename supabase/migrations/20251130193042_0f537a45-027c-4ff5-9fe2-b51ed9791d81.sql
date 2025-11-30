-- Create default_agent_goals table for system-wide default objectives
CREATE TABLE public.default_agent_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('offres', 'transactions', 'commissions', 'clients', 'visites', 'candidatures', 'offres_par_client', 'visites_par_client', 'dossiers_par_client')),
  target_min NUMERIC NOT NULL DEFAULT 1,
  target_max NUMERIC NOT NULL DEFAULT 5,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_agent_goals ENABLE ROW LEVEL SECURITY;

-- Only admins can manage default goals
CREATE POLICY "Admins can manage default goals"
ON public.default_agent_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view default goals
CREATE POLICY "Authenticated users can view default goals"
ON public.default_agent_goals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default goals
INSERT INTO public.default_agent_goals (title, description, goal_type, target_min, target_max, period) VALUES
('Offres envoyées', 'Envoyer des offres chaque jour', 'offres', 3, 5, 'daily'),
('Visites effectuées', 'Effectuer des visites chaque jour', 'visites', 3, 5, 'daily'),
('Candidatures déposées', 'Déposer des candidatures chaque jour', 'candidatures', 5, 7, 'daily'),
('Offres par client', 'Envoyer des offres par client', 'offres_par_client', 3, 5, 'daily'),
('Visites par client', 'Effectuer des visites par client par jour', 'visites_par_client', 1, 2, 'daily'),
('Dossiers par client', 'Envoyer des dossiers par client par jour', 'dossiers_par_client', 1, 3, 'daily');

-- Create agent_badges table for rewards
CREATE TABLE public.agent_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('bronze', 'silver', 'gold', 'star', 'trophy', 'champion', 'legend')),
  badge_category TEXT NOT NULL CHECK (badge_category IN ('offres', 'visites', 'candidatures', 'transactions', 'commissions', 'streak', 'special')),
  title TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  goal_id UUID REFERENCES public.agent_goals(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.agent_badges ENABLE ROW LEVEL SECURITY;

-- Admins can manage all badges
CREATE POLICY "Admins can manage all badges"
ON public.agent_badges
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view their own badges
CREATE POLICY "Agents can view their own badges"
ON public.agent_badges
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM agents 
  WHERE agents.id = agent_badges.agent_id 
  AND agents.user_id = auth.uid()
));

-- System can insert badges (for triggers)
CREATE POLICY "System can insert badges"
ON public.agent_badges
FOR INSERT
WITH CHECK (true);

-- Create function to award badges based on achievements
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
  v_count INTEGER;
  v_badge_exists BOOLEAN;
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

  -- Check for offer milestones
  IF TG_TABLE_NAME = 'offres' THEN
    SELECT COUNT(*) INTO v_count FROM offres WHERE agent_id = v_agent_id;
    
    -- Bronze: 10 offers
    IF v_count >= 10 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'bronze' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'bronze', 'offres', 'Premiers pas', '10 offres envoyées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Silver: 50 offers
    IF v_count >= 50 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'offres', 'Chasseur actif', '50 offres envoyées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Gold: 100 offers
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'offres', 'Expert en offres', '100 offres envoyées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Trophy: 500 offers
    IF v_count >= 500 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'trophy' AND badge_category = 'offres') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'trophy', 'offres', 'Maître des offres', '500 offres envoyées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
  END IF;

  -- Check for transaction milestones
  IF TG_TABLE_NAME = 'transactions' AND NEW.statut = 'conclue' THEN
    SELECT COUNT(*) INTO v_count FROM transactions WHERE agent_id = v_agent_id AND statut = 'conclue';
    
    -- Star: First transaction
    IF v_count >= 1 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'star' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'star', 'transactions', 'Première affaire', 'Première transaction conclue', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Bronze: 5 transactions
    IF v_count >= 5 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'bronze' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'bronze', 'transactions', 'Négociateur confirmé', '5 affaires conclues', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Silver: 20 transactions
    IF v_count >= 20 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'transactions', 'Closer expert', '20 affaires conclues', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Gold: 50 transactions
    IF v_count >= 50 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'transactions', 'Champion des ventes', '50 affaires conclues', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Champion: 100 transactions
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'champion' AND badge_category = 'transactions') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'champion', 'transactions', 'Légende Immo-Rama', '100 affaires conclues', jsonb_build_object('count', v_count));
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
        VALUES (v_agent_id, 'bronze', 'visites', 'Explorateur', '25 visites effectuées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Silver: 100 visits
    IF v_count >= 100 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'silver' AND badge_category = 'visites') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'silver', 'visites', 'Guide immobilier', '100 visites effectuées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
    
    -- Gold: 250 visits
    IF v_count >= 250 THEN
      SELECT EXISTS(SELECT 1 FROM agent_badges WHERE agent_id = v_agent_id AND badge_type = 'gold' AND badge_category = 'visites') INTO v_badge_exists;
      IF NOT v_badge_exists THEN
        INSERT INTO agent_badges (agent_id, badge_type, badge_category, title, description, metadata)
        VALUES (v_agent_id, 'gold', 'visites', 'Maître des visites', '250 visites effectuées', jsonb_build_object('count', v_count));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for badge awards
CREATE TRIGGER award_badges_on_offres
AFTER INSERT ON public.offres
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_badges();

CREATE TRIGGER award_badges_on_transactions
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_badges();

CREATE TRIGGER award_badges_on_visites
AFTER INSERT ON public.visites
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_badges();