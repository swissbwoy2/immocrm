-- Make client-documents bucket public for document URLs to work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'client-documents';