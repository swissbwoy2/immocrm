
-- 1) WA logs: track delivery mode
ALTER TABLE public.whatsapp_notification_logs
  ADD COLUMN IF NOT EXISTS delivery_mode text;

-- 2) Offres: enrich for fiche détaillée
ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS equipements text[],
  ADD COLUMN IF NOT EXISTS description_marketing text,
  ADD COLUMN IF NOT EXISTS annee_construction integer,
  ADD COLUMN IF NOT EXISTS type_chauffage text,
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS classe_energetique text,
  ADD COLUMN IF NOT EXISTS medias_galerie jsonb DEFAULT '[]'::jsonb;

-- 3) Visite comptes rendus
CREATE TABLE IF NOT EXISTS public.visite_comptes_rendus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visite_id uuid NOT NULL REFERENCES public.visites(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL,
  appreciation_globale text,
  etat_general text,
  interet_client text,
  points_forts text[] DEFAULT ARRAY[]::text[],
  points_faibles text[] DEFAULT ARRAY[]::text[],
  commentaire_libre text,
  prochaines_etapes text,
  medias jsonb NOT NULL DEFAULT '[]'::jsonb,
  envoye_au_client_at timestamp with time zone,
  wa_envoye_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (visite_id)
);

CREATE INDEX IF NOT EXISTS idx_vcr_visite ON public.visite_comptes_rendus(visite_id);
CREATE INDEX IF NOT EXISTS idx_vcr_client ON public.visite_comptes_rendus(client_id);
CREATE INDEX IF NOT EXISTS idx_vcr_agent ON public.visite_comptes_rendus(agent_id);

ALTER TABLE public.visite_comptes_rendus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage CR" ON public.visite_comptes_rendus;
CREATE POLICY "Admins manage CR" ON public.visite_comptes_rendus
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Agents manage own CR" ON public.visite_comptes_rendus;
CREATE POLICY "Agents manage own CR" ON public.visite_comptes_rendus
  FOR ALL TO authenticated
  USING (
    client_id IS NOT NULL AND (
      is_agent_of_client_record(client_id) OR is_agent_of_client_via_junction(client_id)
    )
  )
  WITH CHECK (
    client_id IS NOT NULL AND (
      is_agent_of_client_record(client_id) OR is_agent_of_client_via_junction(client_id)
    )
  );

DROP POLICY IF EXISTS "Clients read own sent CR" ON public.visite_comptes_rendus;
CREATE POLICY "Clients read own sent CR" ON public.visite_comptes_rendus
  FOR SELECT TO authenticated
  USING (
    envoye_au_client_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = visite_comptes_rendus.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_vcr_updated_at
  BEFORE UPDATE ON public.visite_comptes_rendus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('visite-medias', 'visite-medias', false),
  ('bien-medias', 'bien-medias', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for visite-medias
DROP POLICY IF EXISTS "vmedias agents admins write" ON storage.objects;
CREATE POLICY "vmedias agents admins write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'visite-medias'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
  )
  WITH CHECK (
    bucket_id = 'visite-medias'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
  );

DROP POLICY IF EXISTS "vmedias auth read" ON storage.objects;
CREATE POLICY "vmedias auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'visite-medias');

-- Policies for bien-medias
DROP POLICY IF EXISTS "bmedias agents admins write" ON storage.objects;
CREATE POLICY "bmedias agents admins write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'bien-medias'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
  )
  WITH CHECK (
    bucket_id = 'bien-medias'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
  );

DROP POLICY IF EXISTS "bmedias auth read" ON storage.objects;
CREATE POLICY "bmedias auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bien-medias');
