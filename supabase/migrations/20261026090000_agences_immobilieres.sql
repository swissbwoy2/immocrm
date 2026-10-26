-- Annuaire des agences immobilières (membres USPI Suisse romande) lu par la routine « logisorama-agences ».
-- Nouvelle table uniquement. Accès réservé aux administrateurs. Pas de suppression (une agence inutile passe en site_statut='ignore').

CREATE TABLE IF NOT EXISTS public.agences_immobilieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_uspi text NOT NULL,
  nom_agence text NOT NULL,
  adresse_postale text,
  npa text,
  ville text,
  telephone text,
  email text,
  site_web text,
  source_uspi text,
  date_collecte date,
  page_location_url text,
  page_achat_url text,
  site_statut text NOT NULL DEFAULT 'a_explorer'
    CHECK (site_statut IN ('a_explorer','ok','sans_annonces','portail_seulement','inaccessible','ignore')),
  derniere_visite_at timestamptz,
  dernier_resultat text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agences_immobilieres_nom_site_uniq UNIQUE (nom_agence, site_web)
);

ALTER TABLE public.agences_immobilieres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins lisent les agences" ON public.agences_immobilieres
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins ajoutent les agences" ON public.agences_immobilieres
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins modifient les agences" ON public.agences_immobilieres
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS agences_immobilieres_region_idx ON public.agences_immobilieres (region_uspi);
CREATE INDEX IF NOT EXISTS agences_immobilieres_visite_idx ON public.agences_immobilieres (derniere_visite_at NULLS FIRST);
