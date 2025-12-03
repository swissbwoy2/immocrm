-- Mettre à jour le bucket message-attachments avec une limite de 1GB (1073741824 bytes)
UPDATE storage.buckets
SET file_size_limit = 1073741824
WHERE id = 'message-attachments';