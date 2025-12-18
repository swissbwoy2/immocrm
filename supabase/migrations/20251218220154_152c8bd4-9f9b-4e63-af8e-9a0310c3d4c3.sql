-- Add contract-related columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS mandat_pdf_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS mandat_signature_data TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS mandat_date_signature TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS demande_mandat_id UUID REFERENCES public.demandes_mandat(id);

-- Create storage bucket for mandate contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('mandat-contracts', 'mandat-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for mandat-contracts bucket
-- Admins can manage all contracts
CREATE POLICY "Admins can manage all contracts"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'mandat-contracts' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Clients can view their own contracts (using split_part to extract client_id from path)
CREATE POLICY "Clients can view their own contracts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mandat-contracts'
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.user_id = auth.uid()
    AND name LIKE c.id::text || '/%'
  )
);

-- Agents can view their clients contracts
CREATE POLICY "Agents can view their clients contracts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mandat-contracts'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE a.user_id = auth.uid()
    AND name LIKE c.id::text || '/%'
  )
);