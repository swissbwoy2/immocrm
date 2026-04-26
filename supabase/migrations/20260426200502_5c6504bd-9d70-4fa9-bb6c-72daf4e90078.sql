
-- =========================================================
-- 1. Add is_demo_account flag on profiles
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo_account boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_demo_account = true
WHERE id = '2e50b7d0-9a76-437c-994d-217c52f0e5e5';

-- =========================================================
-- 2. Security definer helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_demo_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo_account FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- =========================================================
-- 3. Demo sessions analytics table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read demo sessions" ON public.demo_sessions;
CREATE POLICY "Admins can read demo sessions"
ON public.demo_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 4. Read-only enforcement (RESTRICTIVE = ANDed with existing policies)
-- =========================================================

-- messages
DROP POLICY IF EXISTS "Demo accounts cannot insert messages" ON public.messages;
CREATE POLICY "Demo accounts cannot insert messages"
ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot update messages" ON public.messages;
CREATE POLICY "Demo accounts cannot update messages"
ON public.messages AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete messages" ON public.messages;
CREATE POLICY "Demo accounts cannot delete messages"
ON public.messages AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

-- offres
DROP POLICY IF EXISTS "Demo accounts cannot insert offres" ON public.offres;
CREATE POLICY "Demo accounts cannot insert offres"
ON public.offres AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot update offres" ON public.offres;
CREATE POLICY "Demo accounts cannot update offres"
ON public.offres AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete offres" ON public.offres;
CREATE POLICY "Demo accounts cannot delete offres"
ON public.offres AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

-- candidatures
DROP POLICY IF EXISTS "Demo accounts cannot insert candidatures" ON public.candidatures;
CREATE POLICY "Demo accounts cannot insert candidatures"
ON public.candidatures AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot update candidatures" ON public.candidatures;
CREATE POLICY "Demo accounts cannot update candidatures"
ON public.candidatures AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete candidatures" ON public.candidatures;
CREATE POLICY "Demo accounts cannot delete candidatures"
ON public.candidatures AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

-- documents
DROP POLICY IF EXISTS "Demo accounts cannot insert documents" ON public.documents;
CREATE POLICY "Demo accounts cannot insert documents"
ON public.documents AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot update documents" ON public.documents;
CREATE POLICY "Demo accounts cannot update documents"
ON public.documents AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete documents" ON public.documents;
CREATE POLICY "Demo accounts cannot delete documents"
ON public.documents AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

-- visites
DROP POLICY IF EXISTS "Demo accounts cannot insert visites" ON public.visites;
CREATE POLICY "Demo accounts cannot insert visites"
ON public.visites AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot update visites" ON public.visites;
CREATE POLICY "Demo accounts cannot update visites"
ON public.visites AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete visites" ON public.visites;
CREATE POLICY "Demo accounts cannot delete visites"
ON public.visites AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

-- clients
DROP POLICY IF EXISTS "Demo accounts cannot update clients" ON public.clients;
CREATE POLICY "Demo accounts cannot update clients"
ON public.clients AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));

DROP POLICY IF EXISTS "Demo accounts cannot delete clients" ON public.clients;
CREATE POLICY "Demo accounts cannot delete clients"
ON public.clients AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_demo_account(auth.uid()));
