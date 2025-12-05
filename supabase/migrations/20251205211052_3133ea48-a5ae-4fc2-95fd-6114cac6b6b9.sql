-- Add payload column to messages table for storing additional data like medias
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT NULL;