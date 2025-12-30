-- Create ai_matches table to store AI matching results
CREATE TABLE public.ai_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES public.received_emails(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id),
  
  -- Extracted data from email
  extracted_price NUMERIC,
  extracted_pieces NUMERIC,
  extracted_surface NUMERIC,
  extracted_location TEXT,
  extracted_type_bien TEXT,
  extracted_address TEXT,
  extracted_disponibilite TEXT,
  extracted_regie TEXT,
  email_subject TEXT,
  email_from TEXT,
  
  -- Score and status
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'converted')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  converted_to_offre_id UUID REFERENCES public.offres(id),
  
  -- Prevent duplicate matches
  UNIQUE(email_id, client_id)
);

-- Enable RLS
ALTER TABLE public.ai_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all matches"
ON public.ai_matches FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view matches for their clients"
ON public.ai_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = ai_matches.client_id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = ai_matches.client_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agents can update matches for their clients"
ON public.ai_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = ai_matches.client_id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = ai_matches.client_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert matches"
ON public.ai_matches FOR INSERT
WITH CHECK (true);

-- Add column to track if email was analyzed
ALTER TABLE public.received_emails ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN DEFAULT false;
ALTER TABLE public.received_emails ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX idx_ai_matches_status ON public.ai_matches(status);
CREATE INDEX idx_ai_matches_score ON public.ai_matches(match_score DESC);
CREATE INDEX idx_ai_matches_client ON public.ai_matches(client_id);
CREATE INDEX idx_received_emails_analyzed ON public.received_emails(ai_analyzed);

-- Trigger for updated_at
CREATE TRIGGER update_ai_matches_updated_at
BEFORE UPDATE ON public.ai_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();