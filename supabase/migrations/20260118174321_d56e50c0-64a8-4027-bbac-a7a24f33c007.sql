-- Add numero_feuillet column to immeubles table for cadastral sheet number
ALTER TABLE public.immeubles 
ADD COLUMN IF NOT EXISTS numero_feuillet TEXT;