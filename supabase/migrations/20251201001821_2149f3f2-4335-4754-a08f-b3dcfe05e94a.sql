-- Create table to track AbaNinja settings including client numbering
CREATE TABLE public.abaninja_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abaninja_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage abaninja settings"
ON public.abaninja_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Initialize with the last client number (148 = IR0148)
INSERT INTO public.abaninja_settings (key, value) 
VALUES ('last_client_number', '148');

-- Create function to get next client number atomically
CREATE OR REPLACE FUNCTION public.get_next_abaninja_client_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_num integer;
  next_num integer;
  formatted_num text;
BEGIN
  -- Lock the row and get current value
  UPDATE abaninja_settings 
  SET value = (value::integer + 1)::text,
      updated_at = now()
  WHERE key = 'last_client_number'
  RETURNING value::integer INTO next_num;
  
  -- Format as IR0XXX (with leading zeros for 4 digits)
  formatted_num := 'IR' || LPAD(next_num::text, 4, '0');
  
  RETURN formatted_num;
END;
$$;