CREATE TABLE public.annonce_creneaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  date_heure timestamptz NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.annonce_creneaux TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annonce_creneaux TO authenticated;
GRANT ALL ON public.annonce_creneaux TO service_role;
ALTER TABLE public.annonce_creneaux ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_annonce_creneaux_annonce ON public.annonce_creneaux(annonce_id);

CREATE POLICY "Public read active creneaux" ON public.annonce_creneaux FOR SELECT TO anon, authenticated USING (actif = true);
CREATE POLICY "Staff read all creneaux" ON public.annonce_creneaux FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "Staff insert creneaux" ON public.annonce_creneaux FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "Staff update creneaux" ON public.annonce_creneaux FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "Staff delete creneaux" ON public.annonce_creneaux FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE OR REPLACE FUNCTION public.enforce_max_active_creneaux()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.actif AND (SELECT count(*) FROM public.annonce_creneaux
      WHERE annonce_id = NEW.annonce_id AND actif AND id <> NEW.id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 créneaux actifs par annonce';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_max_active_creneaux BEFORE INSERT OR UPDATE ON public.annonce_creneaux
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_active_creneaux();

ALTER TABLE public.candidatures_location ALTER COLUMN lot_id DROP NOT NULL;
ALTER TABLE public.candidatures_location ADD COLUMN annonce_id uuid REFERENCES public.annonces_publiques(id) ON DELETE SET NULL;
ALTER TABLE public.candidatures_location ADD COLUMN creneau_id uuid REFERENCES public.annonce_creneaux(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_cand_loc_creneau_user ON public.candidatures_location(creneau_id, user_id) WHERE creneau_id IS NOT NULL;