-- lovable-cron-fallback-reviewed: user explicitly requires a 1-minute resilience sweep; primary path is wake-on-enqueue from the client click and the job only calls HTTP when due jobs exist
-- File de traitement des demandes de postulation client (préparation staff uniquement, aucun envoi à la régie).

ALTER TABLE public.candidatures DROP CONSTRAINT IF EXISTS candidatures_statut_check;
ALTER TABLE public.candidatures ADD CONSTRAINT candidatures_statut_check CHECK (statut = ANY (ARRAY[
  'en_attente','acceptee','refusee','bail_conclu','attente_bail','bail_recu','signature_planifiee',
  'signature_effectuee','etat_lieux_fixe','cles_remises','retenu_bailleur','demande_postulation'
]::text[]));

CREATE TABLE public.postulation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id uuid NOT NULL REFERENCES public.offres(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  candidature_id uuid REFERENCES public.candidatures(id) ON DELETE SET NULL,
  requested_by uuid,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','ready','blocked','failed','completed')),
  priority text CHECK (priority IS NULL OR priority IN ('low','normal','high','urgent')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  last_error text,
  ai_result jsonb,
  openai_response_id text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT postulation_jobs_offre_client_key UNIQUE (offre_id, client_id),
  CONSTRAINT postulation_jobs_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX postulation_jobs_due_idx ON public.postulation_jobs (next_attempt_at) WHERE status IN ('queued','failed','processing');
CREATE INDEX postulation_jobs_client_idx ON public.postulation_jobs (client_id);
CREATE INDEX postulation_jobs_status_idx ON public.postulation_jobs (status, created_at DESC);

GRANT SELECT, UPDATE ON public.postulation_jobs TO authenticated;
GRANT ALL ON public.postulation_jobs TO service_role;

ALTER TABLE public.postulation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "postulation_jobs client lit les siens" ON public.postulation_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = postulation_jobs.client_id AND c.user_id = auth.uid()));

CREATE POLICY "postulation_jobs staff lit" ON public.postulation_jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_agent_of_client_record(client_id));

CREATE POLICY "postulation_jobs staff met a jour" ON public.postulation_jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_agent_of_client_record(client_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_agent_of_client_record(client_id));

CREATE OR REPLACE FUNCTION public.postulation_jobs_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_postulation_jobs_touch BEFORE UPDATE ON public.postulation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.postulation_jobs_touch();

-- Point d'entrée unique du clic client « Déposer ma candidature ».
CREATE OR REPLACE FUNCTION public.request_postulation(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_client uuid;
  v_offre record;
  v_cand uuid;
  v_job record;
  v_job_id uuid;
  v_already boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '28000';
  END IF;

  SELECT c.id INTO v_client FROM public.clients c WHERE c.user_id = v_uid ORDER BY c.created_at ASC LIMIT 1;
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Dossier client introuvable' USING ERRCODE = 'P0002';
  END IF;

  -- Verrou sur l'offre : sérialise les doubles clics.
  SELECT o.id, o.client_id, o.statut INTO v_offre FROM public.offres o WHERE o.id = p_offre_id FOR UPDATE;
  IF NOT FOUND OR v_offre.client_id IS DISTINCT FROM v_client THEN
    RAISE EXCEPTION 'Offre introuvable' USING ERRCODE = '42501';
  END IF;

  -- Même règle que canDecideOnOffre (src/lib/visitDecision.ts).
  IF NOT (
    v_offre.statut IN ('interesse','visite_effectuee','candidature_deposee','souhaite_postuler')
    OR EXISTS (
      SELECT 1 FROM public.visites v
      WHERE v.offre_id = p_offre_id AND v.client_id = v_client
        AND COALESCE(v.statut, '') NOT IN ('annulee','refusee')
        AND (
          v.statut = 'effectuee'
          OR v.compte_rendu_at IS NOT NULL
          OR (v.compte_rendu IS NOT NULL AND v.compte_rendu <> '{}'::jsonb AND v.compte_rendu <> 'null'::jsonb)
          OR (v.date_visite IS NOT NULL AND v.date_visite < now())
          OR COALESCE(v.medias::text, '') ILIKE '%video%'
        )
    )
  ) THEN
    RAISE EXCEPTION 'Une visite effectuée est requise avant de déposer une candidature' USING ERRCODE = 'P0001';
  END IF;

  SELECT ca.id INTO v_cand FROM public.candidatures ca
   WHERE ca.offre_id = p_offre_id AND ca.client_id = v_client
   ORDER BY ca.created_at ASC LIMIT 1;
  IF v_cand IS NULL THEN
    INSERT INTO public.candidatures (offre_id, client_id, statut, message_client, dossier_complet)
    VALUES (p_offre_id, v_client, 'demande_postulation',
            'Le client demande l''aide de l''agent pour postuler à ce bien.', false)
    RETURNING id INTO v_cand;
  END IF;

  UPDATE public.offres
     SET statut = CASE WHEN statut IN ('candidature_deposee','acceptee') THEN statut ELSE 'souhaite_postuler' END,
         postulation_demandee_at = COALESCE(postulation_demandee_at, now())
   WHERE id = p_offre_id;

  SELECT j.id, j.status INTO v_job FROM public.postulation_jobs j
   WHERE j.offre_id = p_offre_id AND j.client_id = v_client FOR UPDATE;
  IF FOUND THEN
    v_already := true;
    v_job_id := v_job.id;
    IF v_job.status = 'failed' THEN
      UPDATE public.postulation_jobs
         SET status = 'queued', attempt_count = 0, next_attempt_at = now(), locked_at = NULL,
             last_error = NULL, candidature_id = COALESCE(candidature_id, v_cand)
       WHERE id = v_job_id;
    ELSE
      UPDATE public.postulation_jobs SET candidature_id = COALESCE(candidature_id, v_cand) WHERE id = v_job_id;
    END IF;
  ELSE
    INSERT INTO public.postulation_jobs (offre_id, client_id, candidature_id, requested_by, idempotency_key)
    VALUES (p_offre_id, v_client, v_cand, v_uid, 'postulation:' || p_offre_id || ':' || v_client)
    RETURNING id INTO v_job_id;
  END IF;

  RETURN jsonb_build_object('job_id', v_job_id, 'candidature_id', v_cand, 'already_requested', v_already);
END;
$$;

REVOKE ALL ON FUNCTION public.request_postulation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_postulation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_postulation(uuid) TO authenticated;

-- Revendication atomique (réservée au worker serveur).
CREATE OR REPLACE FUNCTION public.claim_postulation_jobs(p_job_id uuid DEFAULT NULL, p_limit integer DEFAULT 5)
RETURNS SETOF public.postulation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.postulation_jobs j
     SET status = 'processing', locked_at = now(), attempt_count = j.attempt_count + 1
   WHERE j.id IN (
     SELECT x.id FROM public.postulation_jobs x
      WHERE (p_job_id IS NULL OR x.id = p_job_id)
        AND x.attempt_count < x.max_attempts
        AND (
          (x.status IN ('queued','failed') AND x.next_attempt_at <= now())
          OR (x.status = 'processing' AND x.locked_at < now() - interval '10 minutes')
        )
      ORDER BY x.next_attempt_at
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 20))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_postulation_jobs(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_postulation_jobs(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_postulation_jobs(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_postulation_jobs(uuid, integer) TO service_role;

-- Reprise chaque minute, uniquement s'il y a des jobs échus (aucun appel sinon).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.unschedule('process-postulation-jobs-every-minute')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-postulation-jobs-every-minute');
    PERFORM cron.schedule('process-postulation-jobs-every-minute', '* * * * *', $cron$
      SELECT net.http_post(
        url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/process-postulation-job',
        headers := private.edge_service_headers(),
        body := '{"mode":"sweep"}'::jsonb
      )
      WHERE EXISTS (
        SELECT 1 FROM public.postulation_jobs x
         WHERE x.attempt_count < x.max_attempts
           AND ((x.status IN ('queued','failed') AND x.next_attempt_at <= now())
             OR (x.status = 'processing' AND x.locked_at < now() - interval '10 minutes'))
      );
    $cron$);
  END IF;
END
$do$;
