-- Table pour tracker les rappels de visite envoyés
CREATE TABLE public.visit_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visite_id UUID NOT NULL REFERENCES public.visites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'week_before', 'day_before', '3h_before', '1h_before', '30min_before'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(visite_id, user_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.visit_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System can insert reminders" 
ON public.visit_reminders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their reminders" 
ON public.visit_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reminders" 
ON public.visit_reminders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index pour les requêtes de rappel
CREATE INDEX idx_visit_reminders_visite ON public.visit_reminders(visite_id);
CREATE INDEX idx_visit_reminders_type ON public.visit_reminders(reminder_type);