-- Create visites_vente table for property sale visits (if not exists)
CREATE TABLE IF NOT EXISTS public.visites_vente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID REFERENCES public.immeubles(id) ON DELETE CASCADE NOT NULL,
  interet_acheteur_id UUID REFERENCES public.interets_acheteur(id) ON DELETE SET NULL,
  acheteur_nom TEXT,
  acheteur_email TEXT,
  acheteur_telephone TEXT,
  date_visite TIMESTAMPTZ NOT NULL,
  statut TEXT DEFAULT 'planifiee',
  notes_visite TEXT,
  feedback_acheteur TEXT,
  note_interet INTEGER,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on visites_vente
ALTER TABLE public.visites_vente ENABLE ROW LEVEL SECURITY;

-- Create check constraint using a trigger instead of CHECK (for flexibility)
CREATE OR REPLACE FUNCTION public.validate_note_interet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.note_interet IS NOT NULL AND (NEW.note_interet < 1 OR NEW.note_interet > 5) THEN
    RAISE EXCEPTION 'note_interet must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_note_interet_trigger ON public.visites_vente;
CREATE TRIGGER validate_note_interet_trigger
BEFORE INSERT OR UPDATE ON public.visites_vente
FOR EACH ROW
EXECUTE FUNCTION public.validate_note_interet();

-- RLS policies for visites_vente
CREATE POLICY "Admins can manage all visites_vente"
ON public.visites_vente
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can manage visites_vente for their properties"
ON public.visites_vente
FOR ALL
USING (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = visites_vente.immeuble_id
    AND p.agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Proprietaires can view visites_vente for their properties"
ON public.visites_vente
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = visites_vente.immeuble_id
    AND p.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_visites_vente_updated_at ON public.visites_vente;
CREATE TRIGGER update_visites_vente_updated_at
BEFORE UPDATE ON public.visites_vente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();