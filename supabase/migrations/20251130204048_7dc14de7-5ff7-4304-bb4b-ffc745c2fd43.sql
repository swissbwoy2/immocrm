-- Update the file size limit for client-documents bucket to 1GB
UPDATE storage.buckets 
SET file_size_limit = 1073741824 
WHERE id = 'client-documents';