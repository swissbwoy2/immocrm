-- Add client_name and is_archived columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Update existing conversations with client names
UPDATE conversations c
SET client_name = COALESCE(p.prenom || ' ' || p.nom, p.email)
FROM clients cl
JOIN profiles p ON p.id = cl.user_id
WHERE cl.id::text = c.client_id
AND c.client_name IS NULL;