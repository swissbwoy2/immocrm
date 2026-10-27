-- Coursiers : paie au temps pointé (pointage × tarif horaire), contrôlée par l'admin.
-- 1. Chaque pointage porte son statut de paiement et l'historique de sa correction.
-- 2. L'admin peut corriger, ajouter, exclure ou payer un pointage ; le coursier ne peut
--    plus modifier un pointage clôturé, corrigé ou payé (il pointe seulement arrivée/départ).
-- Le tarif appliqué est figé au moment du paiement (tarif_paye) : un changement de tarif
-- ne modifie pas les montants déjà payés.
-- Aucune donnée existante n'est modifiée : tous les pointages actuels restent « à payer ».

ALTER TABLE public.coursier_time_entries
  ADD COLUMN IF NOT EXISTS paye boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paye_at timestamptz,
  ADD COLUMN IF NOT EXISTS paye_par uuid,
  ADD COLUMN IF NOT EXISTS tarif_paye numeric,
  ADD COLUMN IF NOT EXISTS exclue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS corrige_at timestamptz,
  ADD COLUMN IF NOT EXISTS corrige_par uuid,
  ADD COLUMN IF NOT EXISTS motif_correction text,
  ADD COLUMN IF NOT EXISTS ajoute_par_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coursier_time_entries_a_payer
  ON public.coursier_time_entries (coursier_id, started_at)
  WHERE paye = false AND exclue = false;

-- Droits de l'admin (lecture déjà ouverte par « Coursier can view own time entries »).
DROP POLICY IF EXISTS "Admin can insert coursier time entries" ON public.coursier_time_entries;
CREATE POLICY "Admin can insert coursier time entries"
ON public.coursier_time_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin can update coursier time entries" ON public.coursier_time_entries;
CREATE POLICY "Admin can update coursier time entries"
ON public.coursier_time_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin can delete coursier time entries" ON public.coursier_time_entries;
CREATE POLICY "Admin can delete coursier time entries"
ON public.coursier_time_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Garde-fou : s'exécute AVANT le calcul de la durée (ordre alphabétique des triggers).
CREATE OR REPLACE FUNCTION public.coursier_time_entry_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_admin boolean := auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT v_admin AND (OLD.paye OR OLD.corrige_at IS NOT NULL OR OLD.ajoute_par_admin) THEN
      RAISE EXCEPTION 'Ce pointage a été validé par l''administration et ne peut plus être supprimé.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_admin THEN
      NEW.paye := false; NEW.paye_at := NULL; NEW.paye_par := NULL; NEW.tarif_paye := NULL;
      NEW.exclue := false;
      NEW.original_started_at := NULL; NEW.original_ended_at := NULL;
      NEW.corrige_at := NULL; NEW.corrige_par := NULL; NEW.motif_correction := NULL;
      NEW.ajoute_par_admin := false;
    ELSE
      IF NEW.paye THEN
        NEW.paye_at := COALESCE(NEW.paye_at, now());
        NEW.paye_par := COALESCE(NEW.paye_par, auth.uid());
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NOT v_admin THEN
    -- Le coursier ne fait que pointer son départ sur une session encore ouverte.
    IF OLD.ended_at IS NOT NULL OR OLD.paye OR OLD.corrige_at IS NOT NULL THEN
      RAISE EXCEPTION 'Ce pointage est clôturé : demandez une correction à l''administration.';
    END IF;
    NEW.started_at := OLD.started_at;
    NEW.coursier_id := OLD.coursier_id;
    NEW.paye := OLD.paye; NEW.paye_at := OLD.paye_at; NEW.paye_par := OLD.paye_par; NEW.tarif_paye := OLD.tarif_paye;
    NEW.exclue := OLD.exclue;
    NEW.original_started_at := OLD.original_started_at; NEW.original_ended_at := OLD.original_ended_at;
    NEW.corrige_at := OLD.corrige_at; NEW.corrige_par := OLD.corrige_par; NEW.motif_correction := OLD.motif_correction;
    NEW.ajoute_par_admin := OLD.ajoute_par_admin;
    RETURN NEW;
  END IF;

  -- Admin : toute modification des heures est tracée, l'heure d'origine est conservée.
  IF NEW.started_at IS DISTINCT FROM OLD.started_at OR NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
    IF OLD.corrige_at IS NULL AND NOT OLD.ajoute_par_admin THEN
      NEW.original_started_at := OLD.started_at;
      NEW.original_ended_at := OLD.ended_at;
    ELSE
      NEW.original_started_at := OLD.original_started_at;
      NEW.original_ended_at := OLD.original_ended_at;
    END IF;
    NEW.corrige_at := now();
    NEW.corrige_par := auth.uid();
  END IF;

  IF NEW.paye AND NOT OLD.paye THEN
    NEW.paye_at := COALESCE(NEW.paye_at, now());
    NEW.paye_par := COALESCE(NEW.paye_par, auth.uid());
  ELSIF NOT NEW.paye THEN
    NEW.paye_at := NULL;
    NEW.paye_par := NULL;
    NEW.tarif_paye := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coursier_time_entry_a_guard ON public.coursier_time_entries;
CREATE TRIGGER trg_coursier_time_entry_a_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.coursier_time_entries
FOR EACH ROW EXECUTE FUNCTION public.coursier_time_entry_guard();
