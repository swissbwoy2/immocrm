
-- 1. Remove anonymous read access to mandat folder in client-documents bucket
-- Sensitive PII; agents-only access remains via existing authenticated policy
DROP POLICY IF EXISTS "Allow public read access to mandat folder" ON storage.objects;

-- 2. Remove public (anon) read access to message-attachments
-- Participants-only authenticated policy remains
DROP POLICY IF EXISTS "Public read access to message-attachments" ON storage.objects;

-- 3. Restrict documents_immeuble bucket uploads to users with access to the immeuble
-- (folder layout: <immeuble_id>/...)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Users with immeuble access can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents_immeuble'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.has_access_to_immeuble(((storage.foldername(name))[1])::uuid)
);

-- 4. Stop broadcasting PII tables over Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.lead_phone_appointments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_unknown_conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_unknown_messages;
