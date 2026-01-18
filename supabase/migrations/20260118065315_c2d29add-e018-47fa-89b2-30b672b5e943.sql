-- Create cedules_hypothecaires table
CREATE TABLE public.cedules_hypothecaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypotheque_id UUID REFERENCES public.hypotheques(id) ON DELETE CASCADE,
  immeuble_id UUID NOT NULL REFERENCES public.immeubles(id) ON DELETE CASCADE,
  numero_cedule TEXT,
  type_cedule TEXT CHECK (type_cedule IN ('papier', 'registre')),
  rang INTEGER,
  montant NUMERIC NOT NULL,
  date_creation DATE,
  lieu_depot TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cedules_hypothecaires ENABLE ROW LEVEL SECURITY;

-- Proprietaires can view their cedules
CREATE POLICY "Proprietaires can view their cedules"
  ON public.cedules_hypothecaires FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = cedules_hypothecaires.immeuble_id
    AND p.user_id = auth.uid()
  ));

-- Proprietaires can insert their cedules
CREATE POLICY "Proprietaires can insert their cedules"
  ON public.cedules_hypothecaires FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = cedules_hypothecaires.immeuble_id
    AND p.user_id = auth.uid()
  ));

-- Proprietaires can update their cedules
CREATE POLICY "Proprietaires can update their cedules"
  ON public.cedules_hypothecaires FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = cedules_hypothecaires.immeuble_id
    AND p.user_id = auth.uid()
  ));

-- Proprietaires can delete their cedules
CREATE POLICY "Proprietaires can delete their cedules"
  ON public.cedules_hypothecaires FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.immeubles i
    JOIN public.proprietaires p ON i.proprietaire_id = p.id
    WHERE i.id = cedules_hypothecaires.immeuble_id
    AND p.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_cedules_hypothecaires_updated_at
  BEFORE UPDATE ON public.cedules_hypothecaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();