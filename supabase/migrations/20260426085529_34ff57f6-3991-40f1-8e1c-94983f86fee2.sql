-- Table wishlist_biens
CREATE TABLE IF NOT EXISTS public.wishlist_biens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Infos bien
  adresse TEXT NOT NULL,
  npa TEXT,
  ville TEXT,
  nb_pieces NUMERIC,
  surface NUMERIC,
  prix NUMERIC,
  type_bien TEXT,

  -- Lien annonce
  lien_annonce TEXT NOT NULL,
  lien_annonce_normalise TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce(lien_annonce,''), '^https?://(www\.)?', ''))
  ) STORED,
  source_portail TEXT,
  photo_url TEXT,

  -- Contact annonceur
  contact_nom TEXT,
  contact_telephone TEXT,
  contact_email TEXT,

  -- Suivi
  statut TEXT NOT NULL DEFAULT 'a_contacter'
    CHECK (statut IN ('a_contacter','contacte_sans_reponse','offre_envoyee','indisponible','archive')),
  date_dernier_contact TIMESTAMPTZ,
  nb_relances INT NOT NULL DEFAULT 0,
  notes TEXT,
  tags TEXT[],

  -- Lien vers offre
  offre_id UUID REFERENCES public.offres(id) ON DELETE SET NULL,
  date_offre_envoyee TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wishlist_biens_user_lien_unique UNIQUE (user_id, lien_annonce_normalise)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_statut ON public.wishlist_biens(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_wishlist_lien_norm ON public.wishlist_biens(lien_annonce_normalise);

-- RLS
ALTER TABLE public.wishlist_biens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlist_biens;
CREATE POLICY "Users manage own wishlist"
  ON public.wishlist_biens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins see all wishlists" ON public.wishlist_biens;
CREATE POLICY "Admins see all wishlists"
  ON public.wishlist_biens
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
DROP TRIGGER IF EXISTS wishlist_set_updated_at ON public.wishlist_biens;
CREATE TRIGGER wishlist_set_updated_at
  BEFORE UPDATE ON public.wishlist_biens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger sync auto wishlist <-> offres
CREATE OR REPLACE FUNCTION public.sync_wishlist_on_offre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm TEXT;
BEGIN
  IF NEW.lien_annonce IS NULL OR NEW.lien_annonce = '' THEN
    RETURN NEW;
  END IF;

  norm := lower(regexp_replace(NEW.lien_annonce, '^https?://(www\.)?', ''));

  UPDATE public.wishlist_biens
     SET statut = 'offre_envoyee',
         offre_id = NEW.id,
         date_offre_envoyee = COALESCE(NEW.date_envoi, now()),
         updated_at = now()
   WHERE lien_annonce_normalise = norm
     AND statut <> 'archive';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wishlist_on_offre ON public.offres;
CREATE TRIGGER trg_sync_wishlist_on_offre
  AFTER INSERT ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.sync_wishlist_on_offre();