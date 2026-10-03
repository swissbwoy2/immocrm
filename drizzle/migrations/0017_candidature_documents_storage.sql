CREATE POLICY "cand_docs_staff_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'candidature-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')))
WITH CHECK (bucket_id = 'candidature-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));
CREATE POLICY "cand_docs_owner_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'candidature-documents' AND EXISTS (SELECT 1 FROM public.candidatures_location c WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid()));
CREATE POLICY "cand_docs_owner_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'candidature-documents' AND EXISTS (SELECT 1 FROM public.candidatures_location c WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid()));
CREATE POLICY "cand_docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'candidature-documents' AND EXISTS (SELECT 1 FROM public.candidatures_location c WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid()));