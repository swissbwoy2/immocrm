
-- Create acomptes table
CREATE TABLE public.acomptes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  montant NUMERIC NOT NULL DEFAULT 300,
  date_paiement TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'paye' CHECK (statut IN ('paye', 'acquis', 'ristourne')),
  date_ristourne TIMESTAMPTZ,
  notes TEXT,
  demande_mandat_id UUID REFERENCES public.demandes_mandat(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acomptes ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage acomptes" ON public.acomptes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Agents can view their own acomptes
CREATE POLICY "Agents can view their acomptes" ON public.acomptes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = acomptes.agent_id AND a.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_acomptes_updated_at
  BEFORE UPDATE ON public.acomptes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill from demandes_mandat
INSERT INTO public.acomptes (client_id, agent_id, montant, date_paiement, statut, demande_mandat_id)
SELECT 
  c.id as client_id,
  c.agent_id,
  COALESCE(dm.montant_acompte, 300),
  dm.date_paiement,
  'paye',
  dm.id
FROM demandes_mandat dm
JOIN clients c ON c.demande_mandat_id = dm.id
WHERE dm.date_paiement IS NOT NULL;
