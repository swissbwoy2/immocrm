-- Add apport_personnel to demandes_mandat table
ALTER TABLE public.demandes_mandat 
ADD COLUMN IF NOT EXISTS apport_personnel numeric DEFAULT 0;

-- Add apport_personnel to clients table  
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS apport_personnel numeric DEFAULT 0;