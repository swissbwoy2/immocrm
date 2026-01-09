-- =============================================
-- PHASE 1: COMPLETE DATABASE SCHEMA FOR PUBLIC REAL ESTATE PORTAL
-- =============================================

-- 1.1 Categories for listings
CREATE TABLE public.categories_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icone TEXT,
  couleur TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES public.categories_annonces(id),
  ordre INTEGER DEFAULT 0,
  est_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Default categories
INSERT INTO public.categories_annonces (nom, slug, icone, ordre) VALUES
  ('Appartement', 'appartement', 'Building2', 1),
  ('Maison', 'maison', 'Home', 2),
  ('Villa', 'villa', 'Castle', 3),
  ('Studio', 'studio', 'DoorClosed', 4),
  ('Loft', 'loft', 'Warehouse', 5),
  ('Attique', 'attique', 'ArrowUp', 6),
  ('Duplex', 'duplex', 'Layers', 7),
  ('Terrain', 'terrain', 'Map', 8),
  ('Commerce', 'commerce', 'Store', 9),
  ('Bureau', 'bureau', 'Briefcase', 10),
  ('Parking', 'parking', 'Car', 11),
  ('Entrepôt', 'entrepot', 'Package', 12);

-- 1.2 Annonceurs (Public advertisers profiles)
CREATE TABLE public.annonceurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type
  type_annonceur TEXT NOT NULL CHECK (type_annonceur IN ('particulier', 'regie', 'promoteur', 'courtier')),
  
  -- Personal info
  civilite TEXT CHECK (civilite IN ('M.', 'Mme', 'Autre')),
  prenom TEXT,
  nom TEXT NOT NULL,
  date_naissance DATE,
  
  -- Company info (for regies/promoteurs)
  nom_entreprise TEXT,
  numero_registre_commerce TEXT,
  site_web TEXT,
  logo_url TEXT,
  
  -- Contact
  email TEXT NOT NULL,
  telephone TEXT,
  telephone_secondaire TEXT,
  
  -- Address
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  canton TEXT,
  pays TEXT DEFAULT 'Suisse',
  
  -- Verification and status
  est_verifie BOOLEAN DEFAULT false,
  date_verification TIMESTAMPTZ,
  verifie_par UUID REFERENCES auth.users(id),
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu', 'banni')),
  motif_suspension TEXT,
  
  -- Subscription and credits
  type_abonnement TEXT DEFAULT 'gratuit' CHECK (type_abonnement IN ('gratuit', 'standard', 'premium', 'pro')),
  credits_annonces INTEGER DEFAULT 3,
  date_expiration_abonnement TIMESTAMPTZ,
  
  -- Statistics
  nb_annonces_publiees INTEGER DEFAULT 0,
  nb_annonces_actives INTEGER DEFAULT 0,
  nb_vues_totales INTEGER DEFAULT 0,
  nb_contacts_recus INTEGER DEFAULT 0,
  
  -- Rating
  note_moyenne NUMERIC(2,1) DEFAULT 0,
  nb_avis INTEGER DEFAULT 0,
  
  -- Preferences
  notifications_email BOOLEAN DEFAULT true,
  notifications_sms BOOLEAN DEFAULT false,
  langue_preferee TEXT DEFAULT 'fr',
  
  -- Meta
  derniere_connexion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_annonceurs_user_id ON public.annonceurs(user_id);
CREATE INDEX idx_annonceurs_email ON public.annonceurs(email);
CREATE INDEX idx_annonceurs_statut ON public.annonceurs(statut);
CREATE INDEX idx_annonceurs_type ON public.annonceurs(type_annonceur);

-- 1.3 Public Listings (Annonces publiques)
CREATE TABLE public.annonces_publiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonceur_id UUID NOT NULL REFERENCES public.annonceurs(id) ON DELETE CASCADE,
  reference TEXT UNIQUE DEFAULT ('AP-' || upper(substring(md5(random()::text), 1, 8))),
  
  -- Classification
  categorie_id UUID REFERENCES public.categories_annonces(id),
  type_transaction TEXT NOT NULL CHECK (type_transaction IN ('vente', 'location')),
  sous_type TEXT CHECK (sous_type IN ('location_longue', 'location_courte', 'colocation', 'sous_location')),
  
  -- Title and description
  titre TEXT NOT NULL,
  description TEXT,
  description_courte TEXT,
  points_forts TEXT[],
  mots_cles TEXT[],
  
  -- Location
  adresse TEXT NOT NULL,
  adresse_complementaire TEXT,
  code_postal TEXT NOT NULL,
  ville TEXT NOT NULL,
  canton TEXT,
  pays TEXT DEFAULT 'Suisse',
  quartier TEXT,
  
  -- GPS coordinates
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  afficher_adresse_exacte BOOLEAN DEFAULT true,
  
  -- Price
  prix NUMERIC NOT NULL,
  prix_affichage TEXT,
  prix_au_m2 NUMERIC,
  charges_mensuelles NUMERIC,
  charges_comprises BOOLEAN DEFAULT false,
  depot_garantie NUMERIC,
  nb_mois_garantie INTEGER DEFAULT 3,
  
  -- Main characteristics
  surface_habitable NUMERIC,
  surface_utile NUMERIC,
  surface_terrain NUMERIC,
  nombre_pieces NUMERIC,
  nb_chambres INTEGER,
  nb_salles_bain INTEGER,
  nb_wc INTEGER,
  etage INTEGER,
  nb_etages_immeuble INTEGER,
  
  -- Construction
  annee_construction INTEGER,
  annee_renovation INTEGER,
  etat_bien TEXT CHECK (etat_bien IN ('neuf', 'recent', 'bon_etat', 'a_rafraichir', 'a_renover')),
  type_chauffage TEXT,
  source_energie TEXT,
  
  -- Energy
  classe_energetique TEXT CHECK (classe_energetique IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  indice_energetique NUMERIC,
  emissions_co2 NUMERIC,
  
  -- Exterior
  balcon BOOLEAN DEFAULT false,
  surface_balcon NUMERIC,
  terrasse BOOLEAN DEFAULT false,
  surface_terrasse NUMERIC,
  jardin BOOLEAN DEFAULT false,
  surface_jardin NUMERIC,
  piscine BOOLEAN DEFAULT false,
  
  -- Parking
  parking_inclus BOOLEAN DEFAULT false,
  nb_places_parking INTEGER,
  type_parking TEXT CHECK (type_parking IN ('interieur', 'exterieur', 'couvert', 'box')),
  
  -- Equipment (JSON array)
  equipements JSONB DEFAULT '[]',
  
  -- Accessibility
  acces_pmr BOOLEAN DEFAULT false,
  animaux_autorises BOOLEAN,
  fumeurs_acceptes BOOLEAN,
  
  -- Availability
  disponible_des DATE,
  disponible_immediatement BOOLEAN DEFAULT false,
  duree_bail_min INTEGER,
  
  -- Contact
  nom_contact TEXT,
  telephone_contact TEXT,
  email_contact TEXT,
  whatsapp_contact TEXT,
  horaires_contact TEXT,
  
  -- Moderation
  statut TEXT DEFAULT 'brouillon' CHECK (statut IN (
    'brouillon', 'en_attente', 'publie', 'refuse', 
    'expire', 'archive', 'vendu', 'loue', 'suspendu'
  )),
  motif_refus TEXT,
  modere_par UUID REFERENCES auth.users(id),
  date_moderation TIMESTAMPTZ,
  
  -- Publication
  date_soumission TIMESTAMPTZ,
  date_publication TIMESTAMPTZ,
  date_expiration TIMESTAMPTZ,
  duree_publication INTEGER DEFAULT 30,
  renouvellements INTEGER DEFAULT 0,
  
  -- Featured
  est_mise_en_avant BOOLEAN DEFAULT false,
  date_debut_mise_avant TIMESTAMPTZ,
  date_fin_mise_avant TIMESTAMPTZ,
  position_mise_avant INTEGER,
  
  -- Statistics
  nb_vues INTEGER DEFAULT 0,
  nb_vues_uniques INTEGER DEFAULT 0,
  nb_favoris INTEGER DEFAULT 0,
  nb_contacts INTEGER DEFAULT 0,
  nb_partages INTEGER DEFAULT 0,
  
  -- SEO
  slug TEXT UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  
  -- Meta
  source TEXT DEFAULT 'portail',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_annonces_publiques_statut ON public.annonces_publiques(statut);
CREATE INDEX idx_annonces_publiques_annonceur ON public.annonces_publiques(annonceur_id);
CREATE INDEX idx_annonces_publiques_categorie ON public.annonces_publiques(categorie_id);
CREATE INDEX idx_annonces_publiques_ville ON public.annonces_publiques(ville);
CREATE INDEX idx_annonces_publiques_canton ON public.annonces_publiques(canton);
CREATE INDEX idx_annonces_publiques_prix ON public.annonces_publiques(prix);
CREATE INDEX idx_annonces_publiques_pieces ON public.annonces_publiques(nombre_pieces);
CREATE INDEX idx_annonces_publiques_coords ON public.annonces_publiques(latitude, longitude);
CREATE INDEX idx_annonces_publiques_featured ON public.annonces_publiques(est_mise_en_avant, date_fin_mise_avant);
CREATE INDEX idx_annonces_publiques_type_transaction ON public.annonces_publiques(type_transaction);
CREATE INDEX idx_annonces_publiques_search ON public.annonces_publiques USING gin(to_tsvector('french', titre || ' ' || COALESCE(description, '')));

-- Trigger for automatic slug generation
CREATE OR REPLACE FUNCTION generate_annonce_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := lower(regexp_replace(
    NEW.titre || '-' || NEW.ville || '-' || NEW.reference,
    '[^a-zA-Z0-9]+', '-', 'g'
  ));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_annonce_slug
BEFORE INSERT OR UPDATE ON public.annonces_publiques
FOR EACH ROW EXECUTE FUNCTION generate_annonce_slug();

-- 1.4 Photos for listings
CREATE TABLE public.photos_annonces_publiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id UUID NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_thumbnail TEXT,
  est_principale BOOLEAN DEFAULT false,
  ordre INTEGER DEFAULT 0,
  legende TEXT,
  type_media TEXT DEFAULT 'photo' CHECK (type_media IN ('photo', 'video', 'visite_virtuelle', 'plan')),
  largeur INTEGER,
  hauteur INTEGER,
  taille_octets INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_annonces_annonce ON public.photos_annonces_publiques(annonce_id);

-- 1.5 Favorites/Bookmarks
CREATE TABLE public.favoris_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annonce_id UUID NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  note_personnelle TEXT,
  alerte_prix BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, annonce_id)
);

CREATE INDEX idx_favoris_user ON public.favoris_annonces(user_id);
CREATE INDEX idx_favoris_annonce ON public.favoris_annonces(annonce_id);

-- 1.6 Reviews for advertisers
CREATE TABLE public.avis_annonceurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonceur_id UUID NOT NULL REFERENCES public.annonceurs(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ratings
  note_globale INTEGER NOT NULL CHECK (note_globale BETWEEN 1 AND 5),
  note_communication INTEGER CHECK (note_communication BETWEEN 1 AND 5),
  note_professionnalisme INTEGER CHECK (note_professionnalisme BETWEEN 1 AND 5),
  note_reactivite INTEGER CHECK (note_reactivite BETWEEN 1 AND 5),
  
  -- Content
  titre TEXT,
  commentaire TEXT NOT NULL,
  
  -- Moderation
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'refuse', 'signale')),
  modere_par UUID REFERENCES auth.users(id),
  date_moderation TIMESTAMPTZ,
  motif_refus TEXT,
  
  -- Advertiser response
  reponse_annonceur TEXT,
  date_reponse TIMESTAMPTZ,
  
  -- Verification
  transaction_verifiee BOOLEAN DEFAULT false,
  
  -- Meta
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(annonceur_id, auteur_id)
);

CREATE INDEX idx_avis_annonceur ON public.avis_annonceurs(annonceur_id);
CREATE INDEX idx_avis_statut ON public.avis_annonceurs(statut);

-- Trigger to update advertiser average rating
CREATE OR REPLACE FUNCTION update_annonceur_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.annonceurs SET
    note_moyenne = (
      SELECT COALESCE(AVG(note_globale), 0) 
      FROM public.avis_annonceurs 
      WHERE annonceur_id = COALESCE(NEW.annonceur_id, OLD.annonceur_id) 
        AND statut = 'approuve'
    ),
    nb_avis = (
      SELECT COUNT(*) 
      FROM public.avis_annonceurs 
      WHERE annonceur_id = COALESCE(NEW.annonceur_id, OLD.annonceur_id) 
        AND statut = 'approuve'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.annonceur_id, OLD.annonceur_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_annonceur_rating
AFTER INSERT OR UPDATE OR DELETE ON public.avis_annonceurs
FOR EACH ROW EXECUTE FUNCTION update_annonceur_rating();

-- 1.7 Conversations for listings
CREATE TABLE public.conversations_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id UUID REFERENCES public.annonces_publiques(id) ON DELETE SET NULL,
  participant_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dernier_message_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status per participant
  archive_par_1 BOOLEAN DEFAULT false,
  archive_par_2 BOOLEAN DEFAULT false,
  bloque_par_1 BOOLEAN DEFAULT false,
  bloque_par_2 BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.messages_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations_annonces(id) ON DELETE CASCADE,
  expediteur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  contenu TEXT NOT NULL,
  piece_jointe_url TEXT,
  piece_jointe_nom TEXT,
  
  -- Status
  lu BOOLEAN DEFAULT false,
  date_lecture TIMESTAMPTZ,
  supprime BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_annonces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations_annonces;

CREATE INDEX idx_conversations_participants ON public.conversations_annonces(participant_1_id, participant_2_id);
CREATE INDEX idx_messages_conversation ON public.messages_annonces(conversation_id);
CREATE INDEX idx_messages_expediteur ON public.messages_annonces(expediteur_id);

-- 1.8 Saved searches / Alerts
CREATE TABLE public.recherches_sauvegardees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  
  -- Criteria
  type_transaction TEXT,
  categorie_id UUID REFERENCES public.categories_annonces(id),
  ville TEXT,
  canton TEXT,
  code_postal TEXT,
  rayon_km INTEGER,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  
  prix_min NUMERIC,
  prix_max NUMERIC,
  surface_min NUMERIC,
  surface_max NUMERIC,
  pieces_min NUMERIC,
  pieces_max NUMERIC,
  
  equipements_requis TEXT[],
  
  -- Alerts
  alerte_active BOOLEAN DEFAULT true,
  frequence_alerte TEXT DEFAULT 'quotidien' CHECK (frequence_alerte IN ('immediat', 'quotidien', 'hebdomadaire')),
  derniere_alerte TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recherches_user ON public.recherches_sauvegardees(user_id);

-- 1.9 Reports/Claims
CREATE TABLE public.signalements_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id UUID REFERENCES public.annonces_publiques(id) ON DELETE SET NULL,
  annonceur_id UUID REFERENCES public.annonceurs(id) ON DELETE SET NULL,
  signale_par UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type_signalement TEXT NOT NULL CHECK (type_signalement IN (
    'contenu_inapproprie', 'fausse_annonce', 'arnaque', 
    'doublon', 'info_incorrecte', 'spam', 'autre'
  )),
  description TEXT NOT NULL,
  preuves_urls TEXT[],
  
  -- Processing
  statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'resolu', 'rejete')),
  traite_par UUID REFERENCES auth.users(id),
  date_traitement TIMESTAMPTZ,
  action_prise TEXT,
  notes_internes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.10 Payments for listings
CREATE TABLE public.paiements_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonceur_id UUID NOT NULL REFERENCES public.annonceurs(id) ON DELETE CASCADE,
  annonce_id UUID REFERENCES public.annonces_publiques(id) ON DELETE SET NULL,
  
  -- Payment type
  type_paiement TEXT NOT NULL CHECK (type_paiement IN (
    'publication', 'renouvellement', 'mise_en_avant', 
    'abonnement', 'credits'
  )),
  
  -- Amount
  montant NUMERIC NOT NULL,
  devise TEXT DEFAULT 'CHF',
  
  -- Product details
  description TEXT,
  duree_jours INTEGER,
  nb_credits INTEGER,
  
  -- Payment
  methode_paiement TEXT CHECK (methode_paiement IN ('carte', 'twint', 'facture', 'credits')),
  statut_paiement TEXT DEFAULT 'en_attente' CHECK (statut_paiement IN (
    'en_attente', 'paye', 'echoue', 'rembourse', 'annule'
  )),
  reference_externe TEXT,
  date_paiement TIMESTAMPTZ,
  
  -- Invoice
  numero_facture TEXT,
  facture_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.11 Views tracking
CREATE TABLE public.vues_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id UUID NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vues_annonce ON public.vues_annonces(annonce_id);
CREATE INDEX idx_vues_date ON public.vues_annonces(created_at);

-- =============================================
-- RLS POLICIES (using user_roles table)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.categories_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonceurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces_publiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos_annonces_publiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoris_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avis_annonceurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recherches_sauvegardees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signalements_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vues_annonces ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Categories are publicly readable"
ON public.categories_annonces FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories_annonces FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Annonceurs: public read for active, own profile management
CREATE POLICY "Public can view active annonceurs"
ON public.annonceurs FOR SELECT
USING (statut = 'actif');

CREATE POLICY "Users can manage own annonceur profile"
ON public.annonceurs FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all annonceurs"
ON public.annonceurs FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Annonces: public read for published, owner management
CREATE POLICY "Public can view published annonces"
ON public.annonces_publiques FOR SELECT
USING (statut = 'publie');

CREATE POLICY "Annonceurs can view own annonces"
ON public.annonces_publiques FOR SELECT
USING (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Annonceurs can insert own annonces"
ON public.annonces_publiques FOR INSERT
WITH CHECK (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Annonceurs can update own annonces"
ON public.annonces_publiques FOR UPDATE
USING (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Annonceurs can delete own annonces"
ON public.annonces_publiques FOR DELETE
USING (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all annonces"
ON public.annonces_publiques FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Photos: linked to annonce access
CREATE POLICY "Public can view photos of published annonces"
ON public.photos_annonces_publiques FOR SELECT
USING (
  annonce_id IN (SELECT id FROM public.annonces_publiques WHERE statut = 'publie')
  OR annonce_id IN (
    SELECT ap.id FROM public.annonces_publiques ap
    JOIN public.annonceurs a ON ap.annonceur_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Annonceurs can manage photos of own annonces"
ON public.photos_annonces_publiques FOR ALL
USING (
  annonce_id IN (
    SELECT ap.id FROM public.annonces_publiques ap
    JOIN public.annonceurs a ON ap.annonceur_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all photos"
ON public.photos_annonces_publiques FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Favoris: user owns their favorites
CREATE POLICY "Users can manage own favorites"
ON public.favoris_annonces FOR ALL
USING (user_id = auth.uid());

-- Avis: public read for approved, user creates own
CREATE POLICY "Public can view approved reviews"
ON public.avis_annonceurs FOR SELECT
USING (statut = 'approuve');

CREATE POLICY "Users can create reviews"
ON public.avis_annonceurs FOR INSERT
WITH CHECK (auteur_id = auth.uid());

CREATE POLICY "Users can update own reviews"
ON public.avis_annonceurs FOR UPDATE
USING (auteur_id = auth.uid());

CREATE POLICY "Annonceurs can respond to reviews"
ON public.avis_annonceurs FOR UPDATE
USING (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all reviews"
ON public.avis_annonceurs FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Conversations: participants only
CREATE POLICY "Participants can view conversations"
ON public.conversations_annonces FOR SELECT
USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Users can create conversations"
ON public.conversations_annonces FOR INSERT
WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Participants can update conversations"
ON public.conversations_annonces FOR UPDATE
USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Messages: linked to conversation access
CREATE POLICY "Participants can view messages"
ON public.messages_annonces FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations_annonces 
    WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON public.messages_annonces FOR INSERT
WITH CHECK (
  expediteur_id = auth.uid() AND
  conversation_id IN (
    SELECT id FROM public.conversations_annonces 
    WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages_annonces FOR UPDATE
USING (expediteur_id = auth.uid());

-- Recherches sauvegardees: user owns their searches
CREATE POLICY "Users can manage own saved searches"
ON public.recherches_sauvegardees FOR ALL
USING (user_id = auth.uid());

-- Signalements: users can create, admins can manage
CREATE POLICY "Users can create reports"
ON public.signalements_annonces FOR INSERT
WITH CHECK (signale_par = auth.uid());

CREATE POLICY "Users can view own reports"
ON public.signalements_annonces FOR SELECT
USING (signale_par = auth.uid());

CREATE POLICY "Admins can manage all reports"
ON public.signalements_annonces FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Paiements: annonceur owns their payments
CREATE POLICY "Annonceurs can view own payments"
ON public.paiements_annonces FOR SELECT
USING (
  annonceur_id IN (SELECT id FROM public.annonceurs WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all payments"
ON public.paiements_annonces FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Vues: anyone can insert, admins can view
CREATE POLICY "Anyone can track views"
ON public.vues_annonces FOR INSERT
WITH CHECK (true);

CREATE POLICY "Annonceurs can view stats of own annonces"
ON public.vues_annonces FOR SELECT
USING (
  annonce_id IN (
    SELECT ap.id FROM public.annonces_publiques ap
    JOIN public.annonceurs a ON ap.annonceur_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all stats"
ON public.vues_annonces FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function for radius search (without PostGIS)
CREATE OR REPLACE FUNCTION search_annonces_radius(
  lat NUMERIC, 
  lng NUMERIC, 
  radius_km INTEGER,
  transaction_type TEXT DEFAULT NULL,
  category_id UUID DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  min_pieces NUMERIC DEFAULT NULL,
  max_pieces NUMERIC DEFAULT NULL
)
RETURNS SETOF annonces_publiques AS $$
  SELECT * FROM annonces_publiques
  WHERE statut = 'publie'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(lat)) * cos(radians(latitude))
        * cos(radians(longitude) - radians(lng))
        + sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= radius_km
    AND (transaction_type IS NULL OR type_transaction = transaction_type)
    AND (category_id IS NULL OR categorie_id = category_id)
    AND (min_price IS NULL OR prix >= min_price)
    AND (max_price IS NULL OR prix <= max_price)
    AND (min_pieces IS NULL OR nombre_pieces >= min_pieces)
    AND (max_pieces IS NULL OR nombre_pieces <= max_pieces)
  ORDER BY est_mise_en_avant DESC, date_publication DESC;
$$ LANGUAGE SQL STABLE;

-- Trigger to update annonceur statistics
CREATE OR REPLACE FUNCTION update_annonceur_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.annonceurs SET
      nb_annonces_actives = (
        SELECT COUNT(*) FROM public.annonces_publiques 
        WHERE annonceur_id = NEW.annonceur_id AND statut = 'publie'
      ),
      nb_annonces_publiees = (
        SELECT COUNT(*) FROM public.annonces_publiques 
        WHERE annonceur_id = NEW.annonceur_id AND statut IN ('publie', 'vendu', 'loue', 'archive')
      ),
      updated_at = now()
    WHERE id = NEW.annonceur_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.annonceurs SET
      nb_annonces_actives = (
        SELECT COUNT(*) FROM public.annonces_publiques 
        WHERE annonceur_id = OLD.annonceur_id AND statut = 'publie'
      ),
      nb_annonces_publiees = (
        SELECT COUNT(*) FROM public.annonces_publiques 
        WHERE annonceur_id = OLD.annonceur_id AND statut IN ('publie', 'vendu', 'loue', 'archive')
      ),
      updated_at = now()
    WHERE id = OLD.annonceur_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_annonceur_stats
AFTER INSERT OR UPDATE OR DELETE ON public.annonces_publiques
FOR EACH ROW EXECUTE FUNCTION update_annonceur_stats();

-- Add 'annonceur' to app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'annonceur' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'annonceur';
  END IF;
END
$$;