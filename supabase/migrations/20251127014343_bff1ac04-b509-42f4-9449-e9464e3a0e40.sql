-- Create table for shared file links
CREATE TABLE public.shared_file_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  document_ids UUID[] NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create index for fast token lookup
CREATE INDEX idx_shared_file_links_token ON public.shared_file_links(token);

-- Enable RLS
ALTER TABLE public.shared_file_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own shared links"
ON public.shared_file_links
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create shared links"
ON public.shared_file_links
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shared links"
ON public.shared_file_links
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shared links"
ON public.shared_file_links
FOR DELETE
USING (auth.uid() = created_by);

-- Admins can manage all
CREATE POLICY "Admins can manage all shared links"
ON public.shared_file_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));