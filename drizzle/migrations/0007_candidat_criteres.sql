CREATE TABLE public.candidat_criteres (
  user_id uuid PRIMARY KEY,
  type_recherche text NOT NULL DEFAULT 'Louer',
  type_bien text,
  pieces_recherche text,
  region_recherche text,
  budget_max numeric,
  nombre_occupants integer,
  date_entree_souhaitee date,
  souhaits_particuliers text,
  decouverte_agence text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.candidat_criteres TO authenticated;
GRANT ALL ON public.candidat_criteres TO service_role;
ALTER TABLE public.candidat_criteres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidat lit ses criteres" ON public.candidat_criteres FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "Candidat cree ses criteres" ON public.candidat_criteres FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Candidat modifie ses criteres" ON public.candidat_criteres FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER candidat_criteres_updated_at BEFORE UPDATE ON public.candidat_criteres
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();