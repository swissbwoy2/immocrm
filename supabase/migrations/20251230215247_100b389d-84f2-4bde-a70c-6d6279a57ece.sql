-- =====================================================
-- PHASE 1 : Extension du module Propriétaire pour VENTE + LOCATION
-- =====================================================

-- 1.1 Table co_proprietaires (gestion multi-propriétaires)
CREATE TABLE IF NOT EXISTS public.co_proprietaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  
  -- Informations du co-propriétaire
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  
  -- Type de lien
  type_lien TEXT NOT NULL, -- proprietaire_principal, conjoint, co_proprietaire, associe, heritier
  quote_part NUMERIC, -- % de propriété (ex: 50 pour 50%)
  
  -- Régime matrimonial (si conjoint)
  regime_matrimonial TEXT, -- participation_acquets, separation_biens, communaute_biens
  
  -- État civil
  etat_civil TEXT,
  
  -- Signature requise pour vente
  signature_requise BOOLEAN DEFAULT true,
  signature_obtenue BOOLEAN DEFAULT false,
  date_signature DATE,
  
  -- Si user_id connu (co-proprio connecté)
  user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Extension de la table immeubles pour la vente
ALTER TABLE public.immeubles 
  ADD COLUMN IF NOT EXISTS mode_exploitation TEXT DEFAULT 'location',
  ADD COLUMN IF NOT EXISTS prix_vente_demande NUMERIC,
  ADD COLUMN IF NOT EXISTS prix_vente_estime NUMERIC,
  ADD COLUMN IF NOT EXISTS date_mise_en_vente DATE,
  ADD COLUMN IF NOT EXISTS statut_vente TEXT,
  ADD COLUMN IF NOT EXISTS publier_espace_acheteur BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accord_proprietaire_publication BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_accord_publication TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description_commerciale TEXT,
  ADD COLUMN IF NOT EXISTS points_forts TEXT[],
  ADD COLUMN IF NOT EXISTS nombre_pieces NUMERIC;

-- 1.3 Table photos_immeuble
CREATE TABLE IF NOT EXISTS public.photos_immeuble (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  
  url TEXT NOT NULL,
  legende TEXT,
  ordre INTEGER DEFAULT 0,
  est_principale BOOLEAN DEFAULT false,
  
  type_photo TEXT, -- facade, salon, cuisine, chambre, salle_bain, exterieur, vue, autre
  
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Extension de documents_immeuble pour confidentialité 3 niveaux
ALTER TABLE public.documents_immeuble 
  ADD COLUMN IF NOT EXISTS confidentialite TEXT DEFAULT 'interne';

-- Mettre à jour les documents existants
UPDATE public.documents_immeuble 
SET confidentialite = CASE 
  WHEN est_confidentiel = true THEN 'confidentiel'
  ELSE 'interne'
END
WHERE confidentialite IS NULL;

-- 1.5 Table interets_acheteur
CREATE TABLE IF NOT EXISTS public.interets_acheteur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  
  type_interet TEXT NOT NULL, -- interesse, demande_visite, demande_brochure
  message TEXT,
  
  statut TEXT DEFAULT 'nouveau', -- nouveau, contacte, visite_planifiee, offre_faite, refuse
  date_visite TIMESTAMPTZ,
  notes_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Table pdf_exports_immeuble
CREATE TABLE IF NOT EXISTS public.pdf_exports_immeuble (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  type_export TEXT NOT NULL, -- brochure_publique, dossier_complet
  genere_par UUID REFERENCES auth.users(id),
  url TEXT,
  taille INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PHASE 2 : Row Level Security Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.co_proprietaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos_immeuble ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interets_acheteur ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_exports_immeuble ENABLE ROW LEVEL SECURITY;

-- Policies for co_proprietaires
CREATE POLICY "Admins can manage all co_proprietaires"
  ON public.co_proprietaires FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Proprietaires can manage co_proprietaires of their immeubles"
  ON public.co_proprietaires FOR ALL
  USING (has_access_to_immeuble(immeuble_id));

-- Policies for photos_immeuble
CREATE POLICY "Admins can manage all photos"
  ON public.photos_immeuble FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage photos"
  ON public.photos_immeuble FOR ALL
  USING (has_access_to_immeuble(immeuble_id));

CREATE POLICY "Acheteurs can view photos of published immeubles"
  ON public.photos_immeuble FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM immeubles i
      WHERE i.id = photos_immeuble.immeuble_id
      AND i.publier_espace_acheteur = true
      AND i.statut_vente = 'publie'
    )
    AND has_role(auth.uid(), 'client')
  );

-- Policies for interets_acheteur
CREATE POLICY "Admins can manage all interets"
  ON public.interets_acheteur FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view and manage interets"
  ON public.interets_acheteur FOR ALL
  USING (has_role(auth.uid(), 'agent'));

CREATE POLICY "Clients can manage their own interets"
  ON public.interets_acheteur FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = interets_acheteur.client_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Proprietaires can view interets on their immeubles"
  ON public.interets_acheteur FOR SELECT
  USING (has_access_to_immeuble(immeuble_id));

-- Policies for pdf_exports_immeuble
CREATE POLICY "Admins can manage all pdf exports"
  ON public.pdf_exports_immeuble FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage pdf exports"
  ON public.pdf_exports_immeuble FOR ALL
  USING (has_access_to_immeuble(immeuble_id));

-- Update documents_immeuble policy for confidentiality
CREATE POLICY "Acheteurs can view public documents of published immeubles"
  ON public.documents_immeuble FOR SELECT
  USING (
    confidentialite = 'public'
    AND has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM immeubles i
      WHERE i.id = documents_immeuble.immeuble_id
      AND i.publier_espace_acheteur = true
      AND i.statut_vente = 'publie'
    )
  );

-- Trigger for updated_at on new tables
CREATE TRIGGER update_co_proprietaires_updated_at
  BEFORE UPDATE ON public.co_proprietaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interets_acheteur_updated_at
  BEFORE UPDATE ON public.interets_acheteur
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger when new interet is created
CREATE OR REPLACE FUNCTION public.notify_on_new_interet_acheteur()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_immeuble_name TEXT;
  v_agent_user_id UUID;
  v_proprietaire_user_id UUID;
BEGIN
  -- Get client name
  SELECT COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_client_name
  FROM clients c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.id = NEW.client_id;
  
  -- Get immeuble name and owner info
  SELECT i.nom, prop.user_id, a.user_id INTO v_immeuble_name, v_proprietaire_user_id, v_agent_user_id
  FROM immeubles i
  JOIN proprietaires prop ON prop.id = i.proprietaire_id
  LEFT JOIN agents a ON a.id = prop.agent_id
  WHERE i.id = NEW.immeuble_id;
  
  -- Notify agent
  IF v_agent_user_id IS NOT NULL THEN
    PERFORM create_notification(
      v_agent_user_id,
      'new_interet_acheteur',
      '🏠 Nouvel intérêt acheteur',
      v_client_name || ' est intéressé par ' || v_immeuble_name,
      '/agent/interets-acheteurs',
      jsonb_build_object('interet_id', NEW.id::text, 'immeuble_id', NEW.immeuble_id::text)
    );
  END IF;
  
  -- Notify proprietaire
  IF v_proprietaire_user_id IS NOT NULL THEN
    PERFORM create_notification(
      v_proprietaire_user_id,
      'new_interet_acheteur',
      '🏠 Nouvel intérêt pour votre bien',
      'Un acheteur potentiel est intéressé par ' || v_immeuble_name,
      '/proprietaire/immeubles/' || NEW.immeuble_id,
      jsonb_build_object('interet_id', NEW.id::text, 'immeuble_id', NEW.immeuble_id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_new_interet
  AFTER INSERT ON public.interets_acheteur
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_interet_acheteur();