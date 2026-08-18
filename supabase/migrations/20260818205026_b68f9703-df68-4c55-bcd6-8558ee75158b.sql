CREATE POLICY "Staff manage formulaires files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'formulaires-location' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent')))
WITH CHECK (bucket_id = 'formulaires-location' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent')));

CREATE POLICY "Users manage own signature files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'agent-signatures' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'agent-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);