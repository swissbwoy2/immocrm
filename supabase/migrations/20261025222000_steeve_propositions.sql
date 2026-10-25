-- Steeve, lot 3 : actions préparées par Steeve, toujours validées par un humain. Additive et idempotente.
-- Steeve n'exécute rien : il enregistre une proposition (note pour l'agent, changement de critères demandé
-- par le client, brouillon de relance d'une régie, preuve de paiement à vérifier). L'agent du client ou un
-- admin la traite lui-même puis la marque « traitée » ou « rejetée ». Aucun envoi automatique.

CREATE TABLE IF NOT EXISTS public.steeve_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  candidature_id uuid REFERENCES public.candidatures(id) ON DELETE SET NULL,
  offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'a_valider',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT steeve_proposals_kind_check CHECK (kind IN ('note_agent', 'changement_criteres', 'relance_regie', 'preuve_paiement')),
  CONSTRAINT steeve_proposals_status_check CHECK (status IN ('a_valider', 'traitee', 'rejetee')),
  CONSTRAINT steeve_proposals_title_len CHECK (length(title) <= 200),
  CONSTRAINT steeve_proposals_body_len CHECK (length(body) <= 4000)
);
CREATE INDEX IF NOT EXISTS steeve_proposals_status_idx ON public.steeve_proposals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_proposals_client_idx ON public.steeve_proposals (client_id, created_at DESC);

ALTER TABLE public.steeve_proposals ENABLE ROW LEVEL SECURITY;
-- Lecture : admins et agents du client. Aucune écriture directe (Steeve passe par la clé de service,
-- les décisions par staff_decide_steeve_proposal).
DROP POLICY IF EXISTS "Equipe lit les propositions de Steeve" ON public.steeve_proposals;
CREATE POLICY "Equipe lit les propositions de Steeve" ON public.steeve_proposals
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
                WHERE c.id = steeve_proposals.client_id AND a.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
                WHERE ca.client_id = steeve_proposals.client_id AND a.user_id = auth.uid())
  );

-- Le membre de l'équipe peut-il traiter les propositions de ce client ?
CREATE OR REPLACE FUNCTION public.steeve_staff_can_handle(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.has_role(auth.uid(), 'admin'::app_role), false)
      OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
                  WHERE c.id = p_client_id AND a.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
                  WHERE ca.client_id = p_client_id AND a.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.steeve_staff_can_handle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_staff_can_handle(uuid) TO authenticated;

-- Liste pour l'équipe : propositions des clients qu'elle suit, avec le nom du client et le bien concerné.
CREATE OR REPLACE FUNCTION public.staff_list_steeve_proposals(p_status text DEFAULT 'a_valider', p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid, kind text, status text, title text, body text, created_at timestamptz,
  client_id uuid, client_nom text, conversation_id uuid, bien text, contact_regie text,
  decided_at timestamptz, decided_by_nom text, decision_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id, p.kind, p.status, p.title, p.body, p.created_at,
         p.client_id, public.steeve_person_name(c.user_id), p.conversation_id,
         o.adresse, CASE WHEN p.kind = 'relance_regie' THEN left(coalesce(o.contact_gerance, o.contact_annonceur, ''), 300) END,
         p.decided_at, public.steeve_person_name(p.decided_by), p.decision_note
    FROM public.steeve_proposals p
    JOIN public.clients c ON c.id = p.client_id
    LEFT JOIN public.offres o ON o.id = p.offre_id
   WHERE (p_status IS NULL OR p_status = '' OR p.status = p_status)
     AND public.steeve_staff_can_handle(p.client_id)
   ORDER BY p.created_at DESC
   LIMIT least(greatest(coalesce(p_limit, 50), 1), 200);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_list_steeve_proposals(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_list_steeve_proposals(text, integer) TO authenticated;

-- Décision humaine : « traitée » (l'action a été faite par la personne) ou « rejetée ».
CREATE OR REPLACE FUNCTION public.staff_decide_steeve_proposal(p_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.steeve_proposals%ROWTYPE;
BEGIN
  IF p_status NOT IN ('traitee', 'rejetee') THEN
    RAISE EXCEPTION 'Décision invalide' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_row FROM public.steeve_proposals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.steeve_staff_can_handle(v_row.client_id) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_row.status <> 'a_valider' THEN
    RAISE EXCEPTION 'Proposition déjà traitée' USING ERRCODE = '22023';
  END IF;
  UPDATE public.steeve_proposals
     SET status = p_status, decided_by = auth.uid(), decided_at = now(), decision_note = left(nullif(trim(p_note), ''), 500)
   WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'status', p_status);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_decide_steeve_proposal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_decide_steeve_proposal(uuid, text, text) TO authenticated;

-- Copilote admin : nombre de propositions en attente.
CREATE OR REPLACE FUNCTION public.steeve_pending_proposals_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.steeve_proposals WHERE status = 'a_valider';
$$;
REVOKE ALL ON FUNCTION public.steeve_pending_proposals_count() FROM PUBLIC, anon, authenticated;
