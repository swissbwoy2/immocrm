ALTER TABLE public.visites
  ADD COLUMN IF NOT EXISTS client_decision text,
  ADD COLUMN IF NOT EXISTS client_decision_at timestamptz;

ALTER TABLE public.visites
  DROP CONSTRAINT IF EXISTS visites_client_decision_check;
ALTER TABLE public.visites
  ADD CONSTRAINT visites_client_decision_check
  CHECK (client_decision IS NULL OR client_decision IN ('interesse','refuse'));

DROP POLICY IF EXISTS "Clients can update their visites decision" ON public.visites;
CREATE POLICY "Clients can update their visites decision"
ON public.visites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.user_id = auth.uid() AND c.id = visites.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.user_id = auth.uid() AND c.id = visites.client_id
  )
);