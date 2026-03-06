
-- Drop anon INSERT policies on mandate tables (Zero Public Write architecture)
DROP POLICY IF EXISTS "Anon can insert mandates" ON public.mandates;
DROP POLICY IF EXISTS "Anon can insert related parties for unsigned mandates" ON public.mandate_related_parties;
DROP POLICY IF EXISTS "Anon can insert documents for unsigned mandates" ON public.mandate_documents;
