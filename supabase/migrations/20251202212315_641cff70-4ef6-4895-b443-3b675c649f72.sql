-- Create table for caching link previews
CREATE TABLE public.link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  favicon_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast URL lookup
CREATE INDEX idx_link_previews_url ON public.link_previews(url);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read link_previews" ON public.link_previews
  FOR SELECT USING (true);

-- Allow system insert/update
CREATE POLICY "Allow system insert link_previews" ON public.link_previews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow system update link_previews" ON public.link_previews
  FOR UPDATE USING (true);