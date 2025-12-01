-- Add column to store AbaNinja client UUID
ALTER TABLE demandes_mandat 
ADD COLUMN IF NOT EXISTS abaninja_client_uuid text;