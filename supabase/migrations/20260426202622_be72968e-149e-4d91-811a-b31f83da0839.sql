-- 1. Drop the broken RESTRICTIVE FOR ALL policies that were also blocking SELECT
DROP POLICY IF EXISTS "Demo account cannot write clients" ON public.clients;
DROP POLICY IF EXISTS "Demo account cannot write messages" ON public.messages;
DROP POLICY IF EXISTS "Demo account cannot write offres" ON public.offres;
DROP POLICY IF EXISTS "Demo account cannot write visites" ON public.visites;
DROP POLICY IF EXISTS "Demo account cannot write documents" ON public.documents;
DROP POLICY IF EXISTS "Demo account cannot write candidatures" ON public.candidatures;
DROP POLICY IF EXISTS "Demo account cannot write conversations" ON public.conversations;

-- 2. Add the missing per-command RESTRICTIVE policies
CREATE POLICY "Demo accounts cannot insert clients"
  ON public.clients AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_account(auth.uid()));

CREATE POLICY "Demo accounts cannot insert conversations"
  ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_account(auth.uid()));

CREATE POLICY "Demo accounts cannot update conversations"
  ON public.conversations AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_account(auth.uid()));

CREATE POLICY "Demo accounts cannot delete conversations"
  ON public.conversations AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_account(auth.uid()));