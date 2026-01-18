-- Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents_immeuble', 'documents_immeuble', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their properties
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents_immeuble');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents_immeuble');

-- Allow authenticated users to delete their documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents_immeuble');