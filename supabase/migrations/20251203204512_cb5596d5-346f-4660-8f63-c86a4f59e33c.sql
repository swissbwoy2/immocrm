-- Create document_requests table
CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.client_candidates(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_label TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  note TEXT,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create validation trigger for status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_document_request_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'fulfilled', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status value: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_document_request_status
BEFORE INSERT OR UPDATE ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_document_request_status();

-- Enable RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all document_requests
CREATE POLICY "Admins can manage document_requests" ON public.document_requests
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can manage their clients document_requests
CREATE POLICY "Agents can manage their clients document_requests" ON public.document_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = document_requests.client_id
    AND a.user_id = auth.uid()
  )
);

-- Clients can view their document_requests
CREATE POLICY "Clients can view their document_requests" ON public.document_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = document_requests.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;