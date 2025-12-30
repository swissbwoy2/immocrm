-- Create projets_developpement table
CREATE TABLE public.projets_developpement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id UUID REFERENCES public.proprietaires(id) ON DELETE CASCADE NOT NULL,
  immeuble_id UUID REFERENCES public.immeubles(id) ON DELETE SET NULL,
  
  -- Type de projet
  type_projet TEXT NOT NULL CHECK (type_projet IN (
    'vente_terrain', 
    'construction', 
    'renovation_transformation', 
    'demolition_reconstruction', 
    'etude_faisabilite'
  )),
  
  -- Statut du workflow
  statut TEXT DEFAULT 'demande_recue' CHECK (statut IN (
    'demande_recue',
    'analyse_en_cours', 
    'etude_faisabilite_rendue',
    'planification_permis',
    'devis_transmis',
    'permis_en_preparation',
    'permis_depose',
    'attente_reponse_cantonale',
    'projet_valide',
    'projet_refuse',
    'termine'
  )),
  
  -- Informations parcelle
  adresse TEXT,
  commune TEXT,
  parcelle_numero TEXT,
  surface_terrain NUMERIC,
  batiment_existant BOOLEAN DEFAULT false,
  
  -- Indices réglementaires
  cos NUMERIC,
  ibus NUMERIC,
  isus NUMERIC,
  ocus NUMERIC,
  zone_affectation TEXT,
  servitudes_connues BOOLEAN DEFAULT false,
  servitudes_details TEXT,
  
  -- Description du projet
  objectifs TEXT,
  type_construction_souhaitee TEXT CHECK (type_construction_souhaitee IS NULL OR type_construction_souhaitee IN (
    'maison_individuelle',
    'immeuble_locatif', 
    'ppe',
    'residence_secondaire',
    'autre'
  )),
  nombre_unites INTEGER,
  delai_realisation TEXT,
  
  -- Service souhaité
  service_souhaite TEXT CHECK (service_souhaite IS NULL OR service_souhaite IN (
    'etude_faisabilite_gratuite',
    'estimation_budgetaire',
    'demande_permis',
    'dossier_valorisation'
  )),
  besoin_devis BOOLEAN DEFAULT false,
  
  -- Assignation et budget
  architecte_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  budget_previsionnel NUMERIC,
  budget_min NUMERIC,
  budget_max NUMERIC,
  
  -- Métadonnées
  date_soumission TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes_internes TEXT
);

-- Create documents_developpement table
CREATE TABLE public.documents_developpement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id UUID REFERENCES public.projets_developpement(id) ON DELETE CASCADE NOT NULL,
  
  type_document TEXT NOT NULL CHECK (type_document IN (
    'extrait_cadastral',
    'plan_zones',
    'photo_terrain',
    'photo_batiment',
    'plans_existants',
    'pv_copropriete',
    'document_heritage',
    'autorisation_coheritiers',
    'rapport_geotechnique',
    'etude_faisabilite',
    'devis',
    'permis_construire',
    'autre'
  )),
  
  fichier_url TEXT NOT NULL,
  nom_fichier TEXT NOT NULL,
  taille_fichier INTEGER,
  
  visibilite TEXT DEFAULT 'prive' CHECK (visibilite IN ('prive', 'partage')),
  ajoute_par UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create commentaires_developpement table
CREATE TABLE public.commentaires_developpement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id UUID REFERENCES public.projets_developpement(id) ON DELETE CASCADE NOT NULL,
  auteur_id UUID REFERENCES public.profiles(id) NOT NULL,
  contenu TEXT NOT NULL,
  est_interne BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projets_developpement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_developpement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commentaires_developpement ENABLE ROW LEVEL SECURITY;

-- RLS policies for projets_developpement
CREATE POLICY "Admins can manage all projets_developpement"
ON public.projets_developpement FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Proprietaires can view their own projets"
ON public.projets_developpement FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proprietaires p
    WHERE p.id = projets_developpement.proprietaire_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Proprietaires can insert their own projets"
ON public.projets_developpement FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM proprietaires p
    WHERE p.id = projets_developpement.proprietaire_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Proprietaires can update their own projets"
ON public.projets_developpement FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM proprietaires p
    WHERE p.id = projets_developpement.proprietaire_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Agents can view assigned projets"
ON public.projets_developpement FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.user_id = auth.uid()
    AND (a.id = projets_developpement.agent_id OR a.id = projets_developpement.architecte_id)
  )
);

CREATE POLICY "Agents can update assigned projets"
ON public.projets_developpement FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.user_id = auth.uid()
    AND (a.id = projets_developpement.agent_id OR a.id = projets_developpement.architecte_id)
  )
);

-- RLS policies for documents_developpement
CREATE POLICY "Admins can manage all documents_developpement"
ON public.documents_developpement FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view documents of their projets"
ON public.documents_developpement FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projets_developpement pd
    JOIN proprietaires p ON p.id = pd.proprietaire_id
    WHERE pd.id = documents_developpement.projet_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM projets_developpement pd
    JOIN agents a ON (a.id = pd.agent_id OR a.id = pd.architecte_id)
    WHERE pd.id = documents_developpement.projet_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert documents to their projets"
ON public.documents_developpement FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projets_developpement pd
    JOIN proprietaires p ON p.id = pd.proprietaire_id
    WHERE pd.id = documents_developpement.projet_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM projets_developpement pd
    JOIN agents a ON (a.id = pd.agent_id OR a.id = pd.architecte_id)
    WHERE pd.id = documents_developpement.projet_id
    AND a.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete their own documents"
ON public.documents_developpement FOR DELETE
USING (
  ajoute_par = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policies for commentaires_developpement
CREATE POLICY "Admins can manage all commentaires_developpement"
ON public.commentaires_developpement FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view non-internal comments of their projets"
ON public.commentaires_developpement FOR SELECT
USING (
  (
    EXISTS (
      SELECT 1 FROM projets_developpement pd
      JOIN proprietaires p ON p.id = pd.proprietaire_id
      WHERE pd.id = commentaires_developpement.projet_id
      AND p.user_id = auth.uid()
    )
    AND est_interne = false
  )
  OR
  EXISTS (
    SELECT 1 FROM projets_developpement pd
    JOIN agents a ON (a.id = pd.agent_id OR a.id = pd.architecte_id)
    WHERE pd.id = commentaires_developpement.projet_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert comments to their projets"
ON public.commentaires_developpement FOR INSERT
WITH CHECK (
  auteur_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM projets_developpement pd
      JOIN proprietaires p ON p.id = pd.proprietaire_id
      WHERE pd.id = commentaires_developpement.projet_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM projets_developpement pd
      JOIN agents a ON (a.id = pd.agent_id OR a.id = pd.architecte_id)
      WHERE pd.id = commentaires_developpement.projet_id
      AND a.user_id = auth.uid()
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_projets_developpement_updated_at
BEFORE UPDATE ON public.projets_developpement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification function for projet changes
CREATE OR REPLACE FUNCTION public.notify_on_projet_developpement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proprietaire_user_id UUID;
  v_proprietaire_name TEXT;
  v_agent_user_id UUID;
  v_architecte_user_id UUID;
  v_admin_record RECORD;
  v_status_label TEXT;
BEGIN
  -- Get proprietaire user_id
  SELECT p.user_id, COALESCE(pr.prenom || ' ' || pr.nom, pr.email)
  INTO v_proprietaire_user_id, v_proprietaire_name
  FROM proprietaires p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.id = NEW.proprietaire_id;

  -- Get agent and architecte user_ids
  IF NEW.agent_id IS NOT NULL THEN
    SELECT user_id INTO v_agent_user_id FROM agents WHERE id = NEW.agent_id;
  END IF;
  
  IF NEW.architecte_id IS NOT NULL THEN
    SELECT user_id INTO v_architecte_user_id FROM agents WHERE id = NEW.architecte_id;
  END IF;

  -- Status labels in French
  v_status_label := CASE NEW.statut
    WHEN 'demande_recue' THEN 'Demande reçue'
    WHEN 'analyse_en_cours' THEN 'Analyse en cours'
    WHEN 'etude_faisabilite_rendue' THEN 'Étude de faisabilité rendue'
    WHEN 'planification_permis' THEN 'Planification permis'
    WHEN 'devis_transmis' THEN 'Devis transmis'
    WHEN 'permis_en_preparation' THEN 'Permis en préparation'
    WHEN 'permis_depose' THEN 'Permis déposé'
    WHEN 'attente_reponse_cantonale' THEN 'Attente réponse cantonale'
    WHEN 'projet_valide' THEN 'Projet validé'
    WHEN 'projet_refuse' THEN 'Projet refusé'
    WHEN 'termine' THEN 'Terminé'
    ELSE NEW.statut
  END;

  -- On INSERT: notify admins and assigned agents
  IF TG_OP = 'INSERT' THEN
    -- Notify all admins
    FOR v_admin_record IN
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM create_notification(
        v_admin_record.user_id,
        'new_projet_developpement',
        '🏗️ Nouveau projet de développement',
        COALESCE(v_proprietaire_name, 'Un propriétaire') || ' a soumis un projet de développement',
        '/admin/projets-developpement/' || NEW.id,
        jsonb_build_object('projet_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  -- On UPDATE: notify proprietaire of status changes
  IF TG_OP = 'UPDATE' THEN
    -- Status changed
    IF OLD.statut IS DISTINCT FROM NEW.statut THEN
      IF v_proprietaire_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_proprietaire_user_id,
          'projet_statut_change',
          '📋 Mise à jour de votre projet',
          'Statut: ' || v_status_label,
          '/proprietaire/projets-developpement/' || NEW.id,
          jsonb_build_object('projet_id', NEW.id::text, 'statut', NEW.statut)
        );
      END IF;
    END IF;
    
    -- Budget added
    IF OLD.budget_previsionnel IS NULL AND NEW.budget_previsionnel IS NOT NULL THEN
      IF v_proprietaire_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_proprietaire_user_id,
          'projet_budget_added',
          '💰 Budget prévisionnel disponible',
          'Un budget de CHF ' || to_char(NEW.budget_previsionnel, 'FM999''999''999') || ' a été estimé',
          '/proprietaire/projets-developpement/' || NEW.id,
          jsonb_build_object('projet_id', NEW.id::text, 'budget', NEW.budget_previsionnel::text)
        );
      END IF;
    END IF;
    
    -- Architecte assigned
    IF OLD.architecte_id IS NULL AND NEW.architecte_id IS NOT NULL THEN
      IF v_architecte_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_architecte_user_id,
          'projet_assigned',
          '🏗️ Projet assigné',
          'Vous avez été assigné comme architecte sur un projet de développement',
          '/agent/projets-developpement/' || NEW.id,
          jsonb_build_object('projet_id', NEW.id::text)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for notifications
CREATE TRIGGER notify_projet_developpement_change
AFTER INSERT OR UPDATE ON public.projets_developpement
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_projet_developpement_change();

-- Add indexes for performance
CREATE INDEX idx_projets_developpement_proprietaire ON public.projets_developpement(proprietaire_id);
CREATE INDEX idx_projets_developpement_agent ON public.projets_developpement(agent_id);
CREATE INDEX idx_projets_developpement_architecte ON public.projets_developpement(architecte_id);
CREATE INDEX idx_projets_developpement_statut ON public.projets_developpement(statut);
CREATE INDEX idx_documents_developpement_projet ON public.documents_developpement(projet_id);
CREATE INDEX idx_commentaires_developpement_projet ON public.commentaires_developpement(projet_id);