ALTER TABLE public.annonce_creneaux ADD COLUMN IF NOT EXISTS capacite_max integer;
ALTER TABLE public.annonce_creneaux ADD CONSTRAINT annonce_creneaux_capacite_positive CHECK (capacite_max IS NULL OR capacite_max > 0);

CREATE OR REPLACE FUNCTION public.get_creneaux_reservations(_creneau_ids uuid[])
RETURNS TABLE(creneau_id uuid, reservations integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COALESCE((SELECT count(*)::int FROM public.candidatures_location cl
    WHERE cl.creneau_id = c.id AND COALESCE(cl.statut,'') NOT IN ('desiste','refuse')), 0)
  FROM public.annonce_creneaux c
  WHERE c.id = ANY(_creneau_ids)
    AND (c.actif OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
$$;
GRANT EXECUTE ON FUNCTION public.get_creneaux_reservations(uuid[]) TO anon, authenticated;

CREATE POLICY "Agents read creneau candidatures" ON public.candidatures_location
FOR SELECT TO authenticated
USING (creneau_id IS NOT NULL AND public.has_role(auth.uid(),'agent'));