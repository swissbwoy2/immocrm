
-- 1. Add slot_type to visit slots
ALTER TABLE public.relouer_visit_slots
  ADD COLUMN IF NOT EXISTS slot_type text DEFAULT 'physique';

-- 2. Owner can insert timeline events for their own request
CREATE POLICY "Owner inserts relouer_timeline"
  ON public.relouer_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id = relouer_timeline.request_id
        AND r.user_id = auth.uid()
    )
  );

-- 3. Storage policies for relouer-photos
CREATE POLICY "Relouer photos: owner manage own"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'relouer-photos'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'relouer-photos'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Relouer photos: agent manage assigned"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'relouer-photos'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.assigned_agent_id = public.get_my_agent_id()
    )
  )
  WITH CHECK (
    bucket_id = 'relouer-photos'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.assigned_agent_id = public.get_my_agent_id()
    )
  );

CREATE POLICY "Relouer photos: admin manage all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'relouer-photos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'relouer-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Storage policies for relouer-documents
CREATE POLICY "Relouer docs: owner manage own"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'relouer-documents'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'relouer-documents'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Relouer docs: agent manage assigned"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'relouer-documents'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.assigned_agent_id = public.get_my_agent_id()
    )
  )
  WITH CHECK (
    bucket_id = 'relouer-documents'
    AND EXISTS (
      SELECT 1 FROM public.relouer_requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.assigned_agent_id = public.get_my_agent_id()
    )
  );

CREATE POLICY "Relouer docs: admin manage all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'relouer-documents' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'relouer-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
