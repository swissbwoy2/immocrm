CREATE TABLE public.formation_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapitre_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiz_score INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapitre_id)
);

ALTER TABLE public.formation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own formation progress"
ON public.formation_progress
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert their own formation progress"
ON public.formation_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own formation progress"
ON public.formation_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_formation_progress_updated_at
BEFORE UPDATE ON public.formation_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_formation_progress_user ON public.formation_progress(user_id);