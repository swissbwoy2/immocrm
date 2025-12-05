-- Ajouter le rôle apporteur à l'enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'apporteur';

-- Table des apporteurs d'affaires
CREATE TABLE public.apporteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Informations personnelles
  civilite TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'Suisse',
  telephone TEXT,
  
  -- Informations bancaires (Article 9)
  iban TEXT,
  nom_banque TEXT,
  titulaire_compte TEXT,
  bic_swift TEXT,
  
  -- Contrat
  contrat_signe BOOLEAN DEFAULT false,
  signature_data TEXT,
  date_signature TIMESTAMPTZ,
  date_expiration TIMESTAMPTZ,
  contrat_pdf_url TEXT,
  piece_identite_url TEXT,
  
  -- Dispositions particulières (Article 8)
  dispositions_particulieres TEXT,
  
  -- Configuration commission (Article 2)
  taux_commission NUMERIC DEFAULT 20,
  minimum_vente NUMERIC DEFAULT 500,
  minimum_location NUMERIC DEFAULT 150,
  
  -- Statut
  statut TEXT DEFAULT 'en_attente',
  
  -- Statistiques
  nombre_clients_referes INTEGER DEFAULT 0,
  total_commissions_gagnees NUMERIC DEFAULT 0,
  
  -- Métadonnées
  code_parrainage TEXT UNIQUE,
  notes_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des referrals (clients référés)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apporteur_id UUID REFERENCES public.apporteurs(id) ON DELETE SET NULL,
  
  -- Article 1 - Coordonnées du client référé
  client_nom TEXT NOT NULL,
  client_prenom TEXT,
  client_telephone TEXT,
  client_email TEXT,
  lieu_situation TEXT,
  
  -- Type d'affaire
  type_affaire TEXT NOT NULL,
  
  -- Lien avec le système existant
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  demande_mandat_id UUID REFERENCES public.demandes_mandat(id) ON DELETE SET NULL,
  
  -- Calcul commission (Article 2)
  montant_frais_agence NUMERIC,
  taux_commission NUMERIC DEFAULT 20,
  montant_commission NUMERIC,
  
  -- Statut du referral
  statut TEXT DEFAULT 'soumis',
  
  -- Article 3 - Exigibilité
  date_conclusion TIMESTAMPTZ,
  date_validation TIMESTAMPTZ,
  date_paiement TIMESTAMPTZ,
  reference_virement TEXT,
  
  notes TEXT,
  notes_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apporteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour apporteurs
CREATE POLICY "Apporteurs can view own data"
ON public.apporteurs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Apporteurs can update own data"
ON public.apporteurs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all apporteurs"
ON public.apporteurs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert apporteurs"
ON public.apporteurs FOR INSERT
WITH CHECK (true);

-- RLS Policies pour referrals
CREATE POLICY "Apporteurs can view own referrals"
ON public.referrals FOR SELECT
USING (apporteur_id IN (SELECT id FROM apporteurs WHERE user_id = auth.uid()));

CREATE POLICY "Apporteurs can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (apporteur_id IN (SELECT id FROM apporteurs WHERE user_id = auth.uid()));

CREATE POLICY "Apporteurs can update own referrals"
ON public.referrals FOR UPDATE
USING (apporteur_id IN (SELECT id FROM apporteurs WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all referrals"
ON public.referrals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_apporteurs_updated_at
BEFORE UPDATE ON public.apporteurs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer un code parrainage unique
CREATE OR REPLACE FUNCTION public.generate_parrainage_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'IR-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM apporteurs WHERE code_parrainage = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger pour auto-générer le code parrainage
CREATE OR REPLACE FUNCTION public.auto_generate_parrainage_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code_parrainage IS NULL THEN
    NEW.code_parrainage := generate_parrainage_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_parrainage_code
BEFORE INSERT ON public.apporteurs
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_parrainage_code();

-- Fonction pour calculer la commission
CREATE OR REPLACE FUNCTION public.calculate_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apporteur RECORD;
  v_commission NUMERIC;
  v_minimum NUMERIC;
BEGIN
  IF NEW.montant_frais_agence IS NOT NULL AND NEW.montant_frais_agence > 0 THEN
    SELECT * INTO v_apporteur FROM apporteurs WHERE id = NEW.apporteur_id;
    
    IF v_apporteur IS NOT NULL THEN
      v_commission := NEW.montant_frais_agence * (COALESCE(NEW.taux_commission, v_apporteur.taux_commission, 20) / 100);
      
      IF NEW.type_affaire IN ('vente', 'achat') THEN
        v_minimum := COALESCE(v_apporteur.minimum_vente, 500);
      ELSE
        v_minimum := COALESCE(v_apporteur.minimum_location, 150);
      END IF;
      
      NEW.montant_commission := GREATEST(v_commission, v_minimum);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_commission
BEFORE INSERT OR UPDATE OF montant_frais_agence, taux_commission ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.calculate_referral_commission();

-- Fonction pour mettre à jour les stats de l'apporteur
CREATE OR REPLACE FUNCTION public.update_apporteur_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE apporteurs 
    SET nombre_clients_referes = nombre_clients_referes + 1
    WHERE id = NEW.apporteur_id;
  END IF;
  
  IF NEW.statut = 'paye' AND (TG_OP = 'INSERT' OR OLD.statut != 'paye') THEN
    UPDATE apporteurs 
    SET total_commissions_gagnees = total_commissions_gagnees + COALESCE(NEW.montant_commission, 0)
    WHERE id = NEW.apporteur_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_apporteur_stats
AFTER INSERT OR UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_apporteur_stats();