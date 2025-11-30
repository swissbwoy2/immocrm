-- Create agent_goals table for customizable objectives
CREATE TABLE public.agent_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('offres', 'transactions', 'commissions', 'clients', 'visites', 'candidatures')),
  target_value NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

-- Admins can manage all goals
CREATE POLICY "Admins can manage all agent goals"
ON public.agent_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view their own goals
CREATE POLICY "Agents can view their own goals"
ON public.agent_goals
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM agents 
  WHERE agents.id = agent_goals.agent_id 
  AND agents.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_agent_goals_updated_at
BEFORE UPDATE ON public.agent_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();