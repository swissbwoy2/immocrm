CREATE OR REPLACE FUNCTION public.is_coursier_of_visite(_visite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.visites v
    JOIN public.coursiers c ON c.user_id = auth.uid()
    WHERE v.id = _visite_id
      AND (
        (v.coursier_id = c.id AND v.statut_coursier IN ('accepte','termine'))
        OR v.statut_coursier = 'en_attente'
      )
  );
END;
$$;

-- Comptes-rendus : lecture / création / modification limitées aux missions du coursier
CREATE POLICY "Coursiers can view CR of their missions"
ON public.visite_comptes_rendus
FOR SELECT
TO authenticated
USING (public.is_coursier_of_visite(visite_id));

CREATE POLICY "Coursiers can create CR of their missions"
ON public.visite_comptes_rendus
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coursier_of_visite(visite_id)
  AND NOT public.is_demo_account(auth.uid())
);

CREATE POLICY "Coursiers can update CR of their missions"
ON public.visite_comptes_rendus
FOR UPDATE
TO authenticated
USING (public.is_coursier_of_visite(visite_id) AND NOT public.is_demo_account(auth.uid()))
WITH CHECK (public.is_coursier_of_visite(visite_id) AND NOT public.is_demo_account(auth.uid()));

-- Agenda : uniquement les évènements correspondant exactement à ses missions
CREATE POLICY "Coursiers can view calendar events of their missions"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.visites v
    JOIN public.coursiers c ON c.id = v.coursier_id
    WHERE c.user_id = auth.uid()
      AND v.statut_coursier IN ('accepte','termine')
      AND v.client_id = calendar_events.client_id
      AND v.date_visite = calendar_events.event_date
  )
);

-- Documents : dépôt de fichiers/vidéos liés à ses missions, relecture de ses propres dépôts
CREATE POLICY "Coursiers can add documents for their missions"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT public.is_demo_account(auth.uid())
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.visites v
    JOIN public.coursiers c ON c.id = v.coursier_id
    WHERE c.user_id = auth.uid()
      AND v.statut_coursier IN ('accepte','termine')
      AND v.client_id = documents.client_id
  )
);

CREATE POLICY "Coursiers can view documents they uploaded"
ON public.documents
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.coursiers c WHERE c.user_id = auth.uid())
);