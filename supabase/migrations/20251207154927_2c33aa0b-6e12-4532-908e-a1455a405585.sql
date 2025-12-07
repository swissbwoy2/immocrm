-- SECURITY FIX: Remove dangerous public access policy on demandes_mandat
-- This policy was exposing all sensitive personal data (names, emails, phones, IBAN, salaries, signatures) to anyone

-- Drop the dangerous anonymous select policy
DROP POLICY IF EXISTS "Allow anonymous select demandes_mandat by email" ON public.demandes_mandat;

-- Create a more secure policy for anonymous users to check their own demande by email (for status checking)
-- This uses a function to prevent exposing all data
CREATE OR REPLACE FUNCTION public.check_demande_by_email(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.demandes_mandat
    WHERE email = check_email
  )
$$;

-- Create a secure policy that only allows users to see their own demande
-- Either through authenticated session or by matching their email in profiles
CREATE POLICY "Authenticated users can view their own demande by email" 
ON public.demandes_mandat 
FOR SELECT 
USING (
  -- User is authenticated and email matches their profile
  (auth.uid() IS NOT NULL AND email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid()))
  OR
  -- User is authenticated and user_id matches
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Admin access
  has_role(auth.uid(), 'admin')
);