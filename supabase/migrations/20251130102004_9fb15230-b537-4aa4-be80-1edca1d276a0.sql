-- Allow clients to create calendar events for their own candidatures/signatures
CREATE POLICY "Clients can create calendar events for their candidatures"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = calendar_events.client_id
    AND clients.user_id = auth.uid()
  )
);