CREATE TABLE IF NOT EXISTS public.lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL UNIQUE,
  hote_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visite_id uuid,
  offre_id uuid,
  statut text NOT NULL DEFAULT 'en_cours',
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lives_visite ON public.lives(visite_id);
CREATE INDEX IF NOT EXISTS idx_lives_statut ON public.lives(statut);

GRANT SELECT ON public.lives TO authenticated;
GRANT ALL ON public.lives TO service_role;

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lives" ON public.lives
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Host reads own lives" ON public.lives
  FOR SELECT TO authenticated
  USING (hote_id = auth.uid());

CREATE POLICY "Authenticated read ongoing lives" ON public.lives
  FOR SELECT TO authenticated
  USING (statut = 'en_cours');