-- Create app_config table for storing app configuration including version
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read app_config (needed for version check)
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
USING (true);

-- Only admins can update app_config
CREATE POLICY "Admins can manage app_config"
ON public.app_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial app version
INSERT INTO public.app_config (key, value) VALUES ('app_version', '1.0.0');

-- Enable realtime for app_config
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;