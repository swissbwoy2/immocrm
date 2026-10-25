-- Charges de l'agence (loyer, publicité, logiciels, assurances…) pour calculer le bénéfice réel
-- dans le tableau de bord admin. Nouvelle table uniquement : rien n'est modifié ni supprimé ailleurs.
-- Accès réservé aux administrateurs (lecture et écriture).

CREATE TABLE IF NOT EXISTS public.charges_agence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text NOT NULL,
  categorie text NOT NULL DEFAULT 'autre'
    CHECK (categorie IN ('loyer','publicite','logiciels','assurances','vehicule','telephonie','comptabilite','frais_bancaires','impots','materiel','autre')),
  montant numeric(12,2) NOT NULL CHECK (montant >= 0),
  recurrence text NOT NULL DEFAULT 'ponctuelle'
    CHECK (recurrence IN ('ponctuelle','mensuelle','annuelle')),
  date_debut date NOT NULL DEFAULT current_date,
  date_fin date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charges_agence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins lisent les charges" ON public.charges_agence;
CREATE POLICY "Admins lisent les charges" ON public.charges_agence
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins ajoutent les charges" ON public.charges_agence;
CREATE POLICY "Admins ajoutent les charges" ON public.charges_agence
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins modifient les charges" ON public.charges_agence;
CREATE POLICY "Admins modifient les charges" ON public.charges_agence
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pas de suppression : une charge qui s'arrête reçoit une date de fin (historique conservé).

CREATE INDEX IF NOT EXISTS charges_agence_date_idx ON public.charges_agence (date_debut);
