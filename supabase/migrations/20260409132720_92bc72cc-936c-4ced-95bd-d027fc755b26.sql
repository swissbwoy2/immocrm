
-- Create document_update_confirmations table
CREATE TABLE public.document_update_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  fiches_salaire_ok BOOLEAN NOT NULL DEFAULT false,
  poursuites_ok BOOLEAN NOT NULL DEFAULT false,
  permis_ok BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, month_year)
);

-- Enable RLS
ALTER TABLE public.document_update_confirmations ENABLE ROW LEVEL SECURITY;

-- Clients can view their own confirmations
CREATE POLICY "Clients can view own confirmations"
ON public.document_update_confirmations
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Clients can insert their own confirmations
CREATE POLICY "Clients can insert own confirmations"
ON public.document_update_confirmations
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Clients can update their own confirmations
CREATE POLICY "Clients can update own confirmations"
ON public.document_update_confirmations
FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Admins can view all confirmations
CREATE POLICY "Admins can view all confirmations"
ON public.document_update_confirmations
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Agents can view confirmations for their clients
CREATE POLICY "Agents can view client confirmations"
ON public.document_update_confirmations
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE a.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_document_update_confirmations_updated_at
BEFORE UPDATE ON public.document_update_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_doc_update_confirmations_client_month 
ON public.document_update_confirmations(client_id, month_year);
