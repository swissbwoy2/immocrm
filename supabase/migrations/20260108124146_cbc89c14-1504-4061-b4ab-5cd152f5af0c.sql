-- Extension de la table immeubles pour la gestion complète Villa + Appartement
ALTER TABLE public.immeubles
ADD COLUMN IF NOT EXISTS sous_type_bien TEXT,
ADD COLUMN IF NOT EXISTS etage INTEGER,
ADD COLUMN IF NOT EXISTS nb_etages_batiment INTEGER,
ADD COLUMN IF NOT EXISTS nb_garages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_places_int INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_places_ext INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_chambres INTEGER,
ADD COLUMN IF NOT EXISTS nb_wc INTEGER,
ADD COLUMN IF NOT EXISTS nb_salles_eau INTEGER,
ADD COLUMN IF NOT EXISTS surface_balcon NUMERIC,
ADD COLUMN IF NOT EXISTS surface_terrasse NUMERIC,
ADD COLUMN IF NOT EXISTS surface_jardin NUMERIC,
ADD COLUMN IF NOT EXISTS surface_ppe NUMERIC,
ADD COLUMN IF NOT EXISTS surface_au_sol_batiment NUMERIC,
ADD COLUMN IF NOT EXISTS surface_au_sol_garage NUMERIC,
ADD COLUMN IF NOT EXISTS hauteur_plafond NUMERIC,
ADD COLUMN IF NOT EXISTS type_chauffage TEXT,
ADD COLUMN IF NOT EXISTS combustible TEXT,
ADD COLUMN IF NOT EXISTS annee_renovation INTEGER,
ADD COLUMN IF NOT EXISTS no_rf_base TEXT,
ADD COLUMN IF NOT EXISTS no_rf_feuillet TEXT,
ADD COLUMN IF NOT EXISTS lots_rf TEXT,
ADD COLUMN IF NOT EXISTS zone_construction TEXT,
ADD COLUMN IF NOT EXISTS no_eca TEXT,
ADD COLUMN IF NOT EXISTS volume_eca NUMERIC,
ADD COLUMN IF NOT EXISTS valeur_eca NUMERIC,
ADD COLUMN IF NOT EXISTS administrateur_ppe TEXT,
ADD COLUMN IF NOT EXISTS charges_ppe NUMERIC,
ADD COLUMN IF NOT EXISTS charges_chauffage_ec NUMERIC,
ADD COLUMN IF NOT EXISTS fonds_renovation NUMERIC,
ADD COLUMN IF NOT EXISTS est_loue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locataire_actuel TEXT,
ADD COLUMN IF NOT EXISTS email_locataire TEXT,
ADD COLUMN IF NOT EXISTS tel_locataire TEXT,
ADD COLUMN IF NOT EXISTS loyer_actuel NUMERIC,
ADD COLUMN IF NOT EXISTS charges_locataire NUMERIC,
ADD COLUMN IF NOT EXISTS equipements_exterieur JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipements_interieur JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipements_cuisine JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipements_securite JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS type_sol JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exposition JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS caracteristiques_vue JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS caracteristiques_entourage JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS etat_bien JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS distance_gare INTEGER,
ADD COLUMN IF NOT EXISTS distance_bus INTEGER,
ADD COLUMN IF NOT EXISTS distance_garderie INTEGER,
ADD COLUMN IF NOT EXISTS distance_ecole_primaire INTEGER,
ADD COLUMN IF NOT EXISTS distance_ecole_secondaire INTEGER,
ADD COLUMN IF NOT EXISTS distance_gymnase INTEGER,
ADD COLUMN IF NOT EXISTS distance_autoroute INTEGER,
ADD COLUMN IF NOT EXISTS distance_banque INTEGER,
ADD COLUMN IF NOT EXISTS distance_poste INTEGER,
ADD COLUMN IF NOT EXISTS distance_commerces INTEGER,
ADD COLUMN IF NOT EXISTS frequence_rapport TEXT,
ADD COLUMN IF NOT EXISTS date_visite_initiale DATE,
ADD COLUMN IF NOT EXISTS agent_responsable_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS est_apport_affaire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publier_espace_acheteur BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accord_proprietaire_publication BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description_commerciale TEXT,
ADD COLUMN IF NOT EXISTS points_forts TEXT;

-- Table des offres d'achat
CREATE TABLE IF NOT EXISTS public.offres_achat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immeuble_id UUID NOT NULL REFERENCES public.immeubles(id) ON DELETE CASCADE,
  acheteur_id UUID REFERENCES public.clients(id),
  acheteur_nom TEXT,
  acheteur_email TEXT,
  acheteur_telephone TEXT,
  montant_offre NUMERIC NOT NULL,
  date_offre TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_validite DATE,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'acceptee', 'refusee', 'contre_offre', 'expiree', 'annulee')),
  conditions TEXT,
  contre_offre_montant NUMERIC,
  date_contre_offre TIMESTAMP WITH TIME ZONE,
  date_acceptation TIMESTAMP WITH TIME ZONE,
  notes_negociation TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des actes de vente
CREATE TABLE IF NOT EXISTS public.actes_vente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immeuble_id UUID NOT NULL REFERENCES public.immeubles(id) ON DELETE CASCADE,
  offre_id UUID REFERENCES public.offres_achat(id),
  notaire_id UUID REFERENCES public.contacts(id),
  notaire_nom TEXT,
  notaire_adresse TEXT,
  notaire_telephone TEXT,
  acheteur_id UUID REFERENCES public.clients(id),
  acheteur_nom TEXT,
  prix_vente_final NUMERIC NOT NULL,
  date_signature_acte DATE,
  date_entree_jouissance DATE,
  frais_notaire NUMERIC,
  commission_agence NUMERIC,
  taux_commission NUMERIC DEFAULT 1.0,
  commission_payee BOOLEAN DEFAULT false,
  date_paiement_commission TIMESTAMP WITH TIME ZONE,
  statut TEXT NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'signe', 'finalise', 'annule')),
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offres_achat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actes_vente ENABLE ROW LEVEL SECURITY;

-- Policies pour offres_achat
CREATE POLICY "Admins can manage all offres_achat" ON public.offres_achat
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Agents can manage offres for their properties" ON public.offres_achat
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.immeubles i
      WHERE i.id = offres_achat.immeuble_id
      AND i.agent_responsable_id IN (
        SELECT id FROM public.agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Proprietaires can view offres for their properties" ON public.offres_achat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.immeubles i
      WHERE i.id = offres_achat.immeuble_id
      AND i.proprietaire_id IN (
        SELECT id FROM public.proprietaires WHERE user_id = auth.uid()
      )
    )
  );

-- Policies pour actes_vente
CREATE POLICY "Admins can manage all actes_vente" ON public.actes_vente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Agents can manage actes for their properties" ON public.actes_vente
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.immeubles i
      WHERE i.id = actes_vente.immeuble_id
      AND i.agent_responsable_id IN (
        SELECT id FROM public.agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Proprietaires can view actes for their properties" ON public.actes_vente
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.immeubles i
      WHERE i.id = actes_vente.immeuble_id
      AND i.proprietaire_id IN (
        SELECT id FROM public.proprietaires WHERE user_id = auth.uid()
      )
    )
  );

-- Triggers pour updated_at
CREATE OR REPLACE TRIGGER update_offres_achat_updated_at
  BEFORE UPDATE ON public.offres_achat
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_actes_vente_updated_at
  BEFORE UPDATE ON public.actes_vente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_offres_achat_immeuble ON public.offres_achat(immeuble_id);
CREATE INDEX IF NOT EXISTS idx_offres_achat_statut ON public.offres_achat(statut);
CREATE INDEX IF NOT EXISTS idx_actes_vente_immeuble ON public.actes_vente(immeuble_id);
CREATE INDEX IF NOT EXISTS idx_actes_vente_statut ON public.actes_vente(statut);
CREATE INDEX IF NOT EXISTS idx_immeubles_agent_responsable ON public.immeubles(agent_responsable_id);
CREATE INDEX IF NOT EXISTS idx_immeubles_publier ON public.immeubles(publier_espace_acheteur) WHERE publier_espace_acheteur = true;