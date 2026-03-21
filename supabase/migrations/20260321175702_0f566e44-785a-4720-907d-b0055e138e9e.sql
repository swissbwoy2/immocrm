
-- Add formulaire column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS formulaire TEXT;

-- Deduplicate: keep the most recent per email (since formulaire is NULL for all existing)
DELETE FROM public.leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM public.leads
  ORDER BY email, created_at DESC NULLS LAST
);

-- Create unique index
CREATE UNIQUE INDEX leads_email_formulaire_unique_idx 
ON public.leads (email, COALESCE(formulaire, '__none__'));

-- RLS for closeurs
CREATE POLICY "Closeurs can view leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'closeur'));

-- Activation function
CREATE OR REPLACE FUNCTION public.activate_closeur_on_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN;
END;
$$;
