
-- 1. Create coursiers table
CREATE TABLE public.coursiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL DEFAULT '',
  nom TEXT NOT NULL DEFAULT '',
  telephone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on coursiers
ALTER TABLE public.coursiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for coursiers table
CREATE POLICY "Admins can do everything on coursiers"
  ON public.coursiers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coursiers can view their own record"
  ON public.coursiers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coursiers can update their own record"
  ON public.coursiers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Add coursier columns to visites table
ALTER TABLE public.visites
  ADD COLUMN IF NOT EXISTS coursier_id UUID REFERENCES public.coursiers(id),
  ADD COLUMN IF NOT EXISTS statut_coursier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS remuneration_coursier NUMERIC(10,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS paye_coursier BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_coursier TEXT DEFAULT NULL;

-- 3. RLS policies for visites - coursier access
CREATE POLICY "Coursiers can view available and assigned missions"
  ON public.visites FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coursier') AND (
      statut_coursier = 'en_attente'
      OR coursier_id IN (SELECT id FROM public.coursiers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Coursiers can accept available missions"
  ON public.visites FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coursier') AND (
      statut_coursier = 'en_attente'
      OR coursier_id IN (SELECT id FROM public.coursiers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coursier') AND (
      coursier_id IN (SELECT id FROM public.coursiers WHERE user_id = auth.uid())
    )
  );

-- 4. Create indexes for coursier queries
CREATE INDEX IF NOT EXISTS idx_visites_statut_coursier ON public.visites(statut_coursier) WHERE statut_coursier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visites_coursier_id ON public.visites(coursier_id) WHERE coursier_id IS NOT NULL;

-- 5. Trigger for updated_at on coursiers
CREATE TRIGGER update_coursiers_updated_at
  BEFORE UPDATE ON public.coursiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
