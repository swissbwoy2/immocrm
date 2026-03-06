
-- ================================================
-- MANDAT V3 — Phase 1 : Tables, fonctions, RLS, buckets
-- ================================================

-- 1. TABLE: mandates (table principale)
CREATE TABLE public.mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Access token for unauthenticated mandant access
  access_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  token_invalidated_at TIMESTAMPTZ NULL,
  
  -- Identity
  email TEXT NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT,
  date_naissance TEXT,
  nationalite TEXT,
  adresse TEXT,
  npa TEXT,
  ville TEXT,
  type_permis TEXT,
  etat_civil TEXT,
  
  -- Employment
  profession TEXT,
  employeur TEXT,
  revenus_mensuels NUMERIC DEFAULT 0,
  
  -- Personal info
  nombre_enfants INTEGER DEFAULT 0,
  animaux BOOLEAN DEFAULT false,
  notes_personnelles TEXT,
  
  -- Search criteria
  type_recherche TEXT DEFAULT 'Louer',
  type_bien TEXT,
  zone_recherche TEXT,
  pieces_min TEXT,
  budget_max NUMERIC DEFAULT 0,
  date_entree_souhaitee TEXT,
  criteres_obligatoires TEXT,
  criteres_souhaites TEXT,
  
  -- Financial conditions (static for now)
  acompte_montant NUMERIC DEFAULT 300,
  commission_description TEXT DEFAULT '1 mois de loyer brut',
  duree_mandat_mois INTEGER DEFAULT 3,
  reconduction_tacite BOOLEAN DEFAULT true,
  activation_deposit_paid BOOLEAN DEFAULT false,
  
  -- Legal checkboxes (11 mandatory)
  legal_exclusivite BOOLEAN DEFAULT false,
  legal_duree BOOLEAN DEFAULT false,
  legal_commission BOOLEAN DEFAULT false,
  legal_acompte BOOLEAN DEFAULT false,
  legal_resiliation BOOLEAN DEFAULT false,
  legal_obligations_client BOOLEAN DEFAULT false,
  legal_obligations_agence BOOLEAN DEFAULT false,
  legal_protection_donnees BOOLEAN DEFAULT false,
  legal_litiges BOOLEAN DEFAULT false,
  legal_droit_applicable BOOLEAN DEFAULT false,
  legal_acceptation_generale BOOLEAN DEFAULT false,
  
  -- Signature data (set by edge function)
  signature_data TEXT,
  signature_hash TEXT,
  signature_ip TEXT,
  signature_user_agent TEXT,
  signed_at TIMESTAMPTZ,
  contract_version_id UUID,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'active', 'expired', 'cancelled', 'completed')),
  
  -- Metadata
  created_by UUID, -- nullable: public form
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;

-- RLS: Anon can INSERT (public form)
CREATE POLICY "Anon can insert mandates" ON public.mandates
  FOR INSERT WITH CHECK (true);

-- RLS: Only admin can SELECT/UPDATE
CREATE POLICY "Admin can select mandates" ON public.mandates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update mandates" ON public.mandates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. TABLE: mandate_related_parties (tiers liés)
CREATE TABLE public.mandate_related_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'co-titulaire',
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  date_naissance TEXT,
  nationalite TEXT,
  type_permis TEXT,
  profession TEXT,
  employeur TEXT,
  revenus_mensuels NUMERIC DEFAULT 0,
  lien_avec_mandant TEXT,
  signature_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandate_related_parties ENABLE ROW LEVEL SECURITY;

-- Anon INSERT only for unsigned mandates
CREATE POLICY "Anon can insert related parties for unsigned mandates"
  ON public.mandate_related_parties FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mandates WHERE id = mandate_id AND signed_at IS NULL)
  );

CREATE POLICY "Admin can manage related parties" ON public.mandate_related_parties
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. TABLE: mandate_documents
CREATE TABLE public.mandate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_category TEXT DEFAULT 'autre',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert documents for unsigned mandates"
  ON public.mandate_documents FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mandates WHERE id = mandate_id AND signed_at IS NULL)
  );

CREATE POLICY "Admin can manage mandate documents" ON public.mandate_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. TABLE: mandate_audit_logs (NO direct INSERT policy)
CREATE TABLE public.mandate_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  actor_type TEXT DEFAULT 'system',
  actor_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_client_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can SELECT logs
CREATE POLICY "Admin can select audit logs" ON public.mandate_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- NO INSERT/UPDATE/DELETE policy for anyone — only via SECURITY DEFINER function

-- 5. TABLE: mandate_contract_texts (versioned contract text)
CREATE TABLE public.mandate_contract_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandate_contract_texts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active contract text (public form needs it)
CREATE POLICY "Anyone can read active contract texts"
  ON public.mandate_contract_texts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage contract texts" ON public.mandate_contract_texts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. TABLE: mandate_signature_checkpoints (checkbox tracking)
CREATE TABLE public.mandate_signature_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  UNIQUE(mandate_id, checkpoint_key)
);

ALTER TABLE public.mandate_signature_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select checkpoints" ON public.mandate_signature_checkpoints
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- NO direct INSERT — via SECURITY DEFINER function only

-- 7. TABLE: mandate_team_assignments
CREATE TABLE public.mandate_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id),
  role TEXT DEFAULT 'agent',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID
);

ALTER TABLE public.mandate_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage team assignments" ON public.mandate_team_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. TABLE: mandate_pdf_exports
CREATE TABLE public.mandate_pdf_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  version INTEGER DEFAULT 1
);

ALTER TABLE public.mandate_pdf_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pdf exports" ON public.mandate_pdf_exports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- SECURITY DEFINER FUNCTIONS
-- ================================================

-- log_mandate_event: only way to write audit logs
CREATE OR REPLACE FUNCTION public.log_mandate_event(
  p_mandate_id UUID,
  p_event_type TEXT,
  p_event_description TEXT,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_is_client_visible BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO mandate_audit_logs (
    mandate_id, event_type, event_description, actor_type, actor_id,
    ip_address, user_agent, metadata, is_client_visible
  ) VALUES (
    p_mandate_id, p_event_type, p_event_description, p_actor_type, p_actor_id,
    p_ip_address, p_user_agent, p_metadata, p_is_client_visible
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- record_signature_checkpoint: only way to record checkbox timestamps
CREATE OR REPLACE FUNCTION public.record_signature_checkpoint(
  p_mandate_id UUID,
  p_checkpoint_key TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO mandate_signature_checkpoints (mandate_id, checkpoint_key, ip_address)
  VALUES (p_mandate_id, p_checkpoint_key, p_ip_address)
  ON CONFLICT (mandate_id, checkpoint_key) DO UPDATE SET checked_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ================================================
-- TRIGGER: auto-activate on deposit paid
-- ================================================
CREATE OR REPLACE FUNCTION public.auto_activate_mandate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activation_deposit_paid = true 
     AND NEW.signed_at IS NOT NULL 
     AND NEW.status != 'active' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_activate_mandate
  BEFORE UPDATE ON public.mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_mandate();

-- ================================================
-- STORAGE BUCKETS (private)
-- ================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mandates-private', 'mandates-private', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mandates-generated', 'mandates-generated', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Upload only if mandate exists and not signed
CREATE POLICY "Upload mandate files for unsigned mandates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mandates-private'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.mandates
      WHERE id = ((storage.foldername(name))[1])::uuid
      AND signed_at IS NULL
    )
  );

-- Admin can read all mandate files
CREATE POLICY "Admin can read mandate files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('mandates-private', 'mandates-generated')
    AND public.has_role(auth.uid(), 'admin')
  );

-- ================================================
-- SEED: Initial contract text v1
-- ================================================
INSERT INTO public.mandate_contract_texts (version, title, content, is_active)
VALUES ('v3.1', 'Contrat de mandat de recherche immobilière v3', 
'Article 1 – Objet du mandat
Le Client confie à ImmoRésidence Sàrl, ci-après « l''Agence », un mandat exclusif de recherche d''un bien immobilier correspondant aux critères définis dans le présent contrat.

Article 2 – Exclusivité
Le présent mandat est conclu à titre exclusif. Pendant toute la durée du mandat, le Client s''engage à ne pas mandater un autre intermédiaire pour la même recherche et à communiquer à l''Agence toute offre ou opportunité reçue par ses propres moyens.

Article 3 – Durée du mandat
Le mandat est conclu pour une durée de 3 mois à compter de la date de signature. Il est renouvelable tacitement pour des périodes successives de 3 mois, sauf résiliation par l''une des parties avec un préavis de 30 jours avant l''échéance.

Article 4 – Commission de l''Agence
En cas de conclusion d''un contrat de bail grâce à l''intervention de l''Agence, le Client s''engage à verser une commission équivalente à un mois de loyer brut (charges comprises), TVA en sus si applicable. La commission est due dès la signature du bail ou de la promesse de vente.

Article 5 – Acompte d''activation
À la signature du présent mandat, le Client verse un acompte de CHF 300.– (trois cents francs suisses). Cet acompte sera déduit de la commission finale. En cas de résiliation anticipée par le Client sans motif légitime, l''acompte reste acquis à l''Agence à titre de dédit.

Article 6 – Résiliation
Chaque partie peut résilier le mandat par écrit avec un préavis de 30 jours. En cas de résiliation anticipée par le Client, l''acompte versé reste acquis à l''Agence. L''Agence peut résilier le mandat à tout moment si le Client ne respecte pas ses obligations.

Article 7 – Obligations du Client
Le Client s''engage à : fournir des informations exactes et complètes ; informer l''Agence de tout changement de situation ; se rendre disponible pour les visites proposées ; ne pas contacter directement les propriétaires ou régies pour les biens présentés par l''Agence.

Article 8 – Obligations de l''Agence
L''Agence s''engage à : rechercher activement des biens correspondant aux critères du Client ; organiser les visites ; accompagner le Client dans ses démarches administratives ; conseiller le Client de manière professionnelle et transparente.

Article 9 – Protection des données
Les données personnelles collectées sont traitées conformément à la Loi fédérale sur la protection des données (LPD). Elles sont utilisées exclusivement dans le cadre du mandat et ne sont transmises à des tiers que dans la mesure nécessaire à l''exécution du mandat.

Article 10 – Responsabilité
L''Agence agit en qualité d''intermédiaire et ne garantit pas la conclusion d''un contrat. Sa responsabilité est limitée aux cas de faute intentionnelle ou de négligence grave.

Article 11 – Clause de non-contournement
Le Client s''engage à ne pas conclure directement, pendant la durée du mandat et dans les 12 mois suivant son expiration, un contrat portant sur un bien présenté par l''Agence, sans verser la commission convenue.

Article 12 – Litiges
En cas de litige, les parties s''engagent à rechercher une solution amiable. À défaut, le tribunal compétent est celui du siège de l''Agence.

Article 13 – Droit applicable
Le présent contrat est soumis au droit suisse.

Article 14 – Dispositions diverses
Toute modification du présent contrat doit faire l''objet d''un avenant écrit signé par les deux parties. Si une clause est déclarée nulle, les autres clauses restent en vigueur.

Article 15 – Communication
Toute communication relative au présent mandat se fait par email aux adresses indiquées dans le formulaire, ou par courrier recommandé.

Article 16 – Acceptation
En signant le présent mandat, le Client déclare avoir lu, compris et accepté l''intégralité des conditions ci-dessus.', 
true);

-- Updated_at trigger
CREATE TRIGGER set_mandates_updated_at
  BEFORE UPDATE ON public.mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_mandate_related_parties_updated_at
  BEFORE UPDATE ON public.mandate_related_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
