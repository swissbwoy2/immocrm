-- Ristournes faites dans la page Transactions (table acomptes) reprises dans le journal des remboursements :
-- le tableau de bord les déduit du bénéfice et ne les montre plus « à rembourser ». Déjà appliquée en base le 26.10.2026.
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS acompte_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS remboursements_acompte_id_uniq ON public.remboursements (acompte_id) WHERE acompte_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.acompte_ristourne_vers_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom text;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'ristourne' THEN
    RETURN NEW;
  END IF;
  SELECT nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '') INTO v_nom
    FROM public.clients c LEFT JOIN public.profiles p ON p.id = c.user_id WHERE c.id = NEW.client_id;
  INSERT INTO public.remboursements (date_remboursement, client_nom, montant, moyen, client_id, demande_mandat_id, notes, acompte_id)
  VALUES (coalesce(NEW.date_ristourne::date, current_date), coalesce(v_nom, 'Client'), coalesce(NEW.montant, 300),
          'Ristourne', NEW.client_id, NEW.demande_mandat_id, 'Ristourne enregistrée dans Transactions', NEW.id)
  ON CONFLICT (acompte_id) WHERE acompte_id IS NOT NULL DO NOTHING;
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET refund_status = 'processed', refund_processed_at = coalesce(refund_processed_at, NEW.date_ristourne, now())
     WHERE id = NEW.client_id AND refund_status = 'pending';
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'acompte_ristourne_vers_journal: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acompte_ristourne_vers_journal ON public.acomptes;
CREATE TRIGGER trg_acompte_ristourne_vers_journal
  AFTER INSERT OR UPDATE OF statut, date_ristourne ON public.acomptes
  FOR EACH ROW EXECUTE FUNCTION public.acompte_ristourne_vers_journal();

-- Reprise des ristournes déjà faites.
INSERT INTO public.remboursements (date_remboursement, client_nom, montant, moyen, client_id, demande_mandat_id, notes, acompte_id)
SELECT coalesce(a.date_ristourne::date, a.updated_at::date), coalesce(nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''), 'Client'),
       coalesce(a.montant, 300), 'Ristourne', a.client_id, a.demande_mandat_id, 'Ristourne enregistrée dans Transactions (reprise du 26.10.2026)', a.id
  FROM public.acomptes a
  LEFT JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN public.profiles p ON p.id = c.user_id
 WHERE a.statut = 'ristourne'
ON CONFLICT (acompte_id) WHERE acompte_id IS NOT NULL DO NOTHING;

UPDATE public.clients c
   SET refund_status = 'processed', refund_processed_at = coalesce(c.refund_processed_at, a.date_ristourne, now())
  FROM public.acomptes a
 WHERE a.client_id = c.id AND a.statut = 'ristourne' AND c.refund_status = 'pending';
