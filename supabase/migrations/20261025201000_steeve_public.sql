-- Steeve sur le site public (visiteurs non connectés). Additive et idempotente. Désactivé par défaut.
-- Aucune donnée de client n'est accessible : le modèle ne reçoit que les informations publiées du site.
-- Coût borné : plafond quotidien propre, limites par session et par adresse IP (empreintes, jamais l'IP en clair).

INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('steeve_public_enabled', 'false', now()),
  ('steeve_public_day_usd', '2', now()),            -- plafond quotidien du site public (USD)
  ('steeve_public_session_messages', '20', now()),  -- messages par visiteur (session) et par jour
  ('steeve_public_ip_messages', '60', now())        -- messages par adresse IP et par jour
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.steeve_public_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash text NOT NULL,
  ip_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT steeve_public_usage_status_check CHECK (status IN ('pending', 'done', 'failed', 'refused'))
);
CREATE INDEX IF NOT EXISTS steeve_public_usage_created_idx ON public.steeve_public_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_public_usage_session_idx ON public.steeve_public_usage (session_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_public_usage_ip_idx ON public.steeve_public_usage (ip_hash, created_at DESC);

ALTER TABLE public.steeve_public_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent l'usage public de Steeve" ON public.steeve_public_usage;
CREATE POLICY "Admins lisent l'usage public de Steeve" ON public.steeve_public_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Dépense de Steeve : le site public compte dans les totaux du mois et du jour (plafonds globaux).
CREATE OR REPLACE FUNCTION public.steeve_spend(p_client_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich' AS month_start,
           date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich' AS day_start
  )
  SELECT jsonb_build_object(
    'month_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.month_start), 0)
               + COALESCE((SELECT sum(cost_usd) FROM public.steeve_public_usage, bounds WHERE created_at >= bounds.month_start), 0),
    'day_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start), 0)
             + COALESCE((SELECT sum(cost_usd) FROM public.steeve_public_usage, bounds WHERE created_at >= bounds.day_start), 0),
    'client_day_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start AND client_id = p_client_id), 0),
    'client_day_runs', (SELECT count(*) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start AND client_id = p_client_id AND status IN ('done', 'capped'))
  );
$$;
REVOKE ALL ON FUNCTION public.steeve_spend(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_spend(text) TO service_role;

-- Le site affiche la bulle seulement si Steeve public est activé.
CREATE OR REPLACE FUNCTION public.get_steeve_public_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('enabled', COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_public_enabled'), false));
$$;
REVOKE ALL ON FUNCTION public.get_steeve_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_steeve_public_settings() TO anon, authenticated, service_role;

-- Admission d'un message (clé de service) : activé, plafond du jour (Zurich), limites session et IP.
-- Réserve une ligne « pending » comptée immédiatement, pour que des messages simultanés ne dépassent pas les limites.
CREATE OR REPLACE FUNCTION public.steeve_public_admit(p_session_hash text, p_ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_cfg jsonb;
  v_id uuid;
BEGIN
  IF coalesce(p_session_hash, '') = '' OR coalesce(p_ip_hash, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalide');
  END IF;
  SELECT jsonb_object_agg(key, value) INTO v_cfg FROM public.app_config WHERE key LIKE 'steeve_public_%';
  IF coalesce(v_cfg ->> 'steeve_public_enabled', 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  -- Une seule admission à la fois (les limites sont vérifiées sans course).
  PERFORM pg_advisory_xact_lock(hashtext('steeve_public_admit'));
  IF (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage WHERE created_at >= v_day_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_day_usd', '')::numeric, 2)
     -- Plafond mensuel global de Steeve (clients + site public).
     OR coalesce((public.steeve_spend(NULL) ->> 'month_usd')::numeric, 0)
       >= coalesce((SELECT nullif(value, '')::numeric FROM public.app_config WHERE key = 'steeve_budget_month_usd'), 30) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  IF (SELECT count(*) FROM public.steeve_public_usage WHERE session_hash = p_session_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_session_messages', '')::int, 20)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE ip_hash = p_ip_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_ip_messages', '')::int, 60) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'limite');
  END IF;
  INSERT INTO public.steeve_public_usage (session_hash, ip_hash) VALUES (p_session_hash, p_ip_hash) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id, 'model', coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_model'), 'claude-haiku-5-5'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_public_admit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_public_admit(text, text) TO service_role;

-- Les échanges publics restent 30 jours (statistiques de coût), sans contenu de conversation.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-steeve-public-usage') THEN
    PERFORM cron.schedule('purge-steeve-public-usage', '29 3 * * *',
      $cmd$DELETE FROM public.steeve_public_usage WHERE created_at < now() - interval '30 days';$cmd$);
  END IF;
END;
$$;
