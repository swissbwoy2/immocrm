-- Steeve sur le site public (visiteurs non connectés). Additive et idempotente. Désactivé par défaut.
-- Aucune donnée de client n'est accessible : le modèle ne reçoit que les informations publiées du site.
-- Coût borné et séparé de celui des clients : plafonds quotidien et mensuel propres au site, limite globale
-- par minute, limites par session et par adresse IP (empreintes, jamais l'IP en clair). Le site public ne peut
-- donc jamais épuiser le budget qui sert aux réponses des clients.

INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('steeve_public_enabled', 'false', now()),
  ('steeve_public_day_usd', '0.5', now()),          -- plafond quotidien du site public (USD)
  ('steeve_public_month_usd', '5', now()),          -- plafond mensuel du site public (USD), séparé de celui des clients
  ('steeve_public_minute_messages', '30', now()),   -- messages par minute, tous visiteurs confondus
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
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  -- Un message en cours compte pour son coût maximal estimé (500 jetons de réponse, consignes en cache).
  v_pending_cost constant numeric := 0.002;
  v_cfg jsonb;
  v_id uuid;
BEGIN
  IF coalesce(p_session_hash, '') = '' OR coalesce(p_ip_hash, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalide');
  END IF;
  SELECT jsonb_object_agg(key, value) INTO v_cfg FROM public.app_config WHERE key LIKE 'steeve_public_%' OR key = 'steeve_model';
  IF coalesce(v_cfg ->> 'steeve_public_enabled', 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  -- Une seule admission à la fois (les limites sont vérifiées sans course).
  PERFORM pg_advisory_xact_lock(hashtext('steeve_public_admit'));
  IF (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_day_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_day_usd', '')::numeric, 0.5)
     OR (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_month_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_month_usd', '')::numeric, 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  IF (SELECT count(*) FROM public.steeve_public_usage WHERE created_at > now() - interval '1 minute')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_minute_messages', '')::int, 30)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE session_hash = p_session_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_session_messages', '')::int, 20)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE ip_hash = p_ip_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_ip_messages', '')::int, 60) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'limite');
  END IF;
  INSERT INTO public.steeve_public_usage (session_hash, ip_hash) VALUES (p_session_hash, p_ip_hash) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id, 'model', coalesce(v_cfg ->> 'steeve_model', 'claude-haiku-5-5'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_public_admit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_public_admit(text, text) TO service_role;

-- Les échanges publics restent 35 jours (total du mois complet), sans contenu de conversation.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-steeve-public-usage') THEN
    PERFORM cron.schedule('purge-steeve-public-usage', '29 3 * * *',
      $cmd$DELETE FROM public.steeve_public_usage WHERE created_at < now() - interval '35 days';$cmd$);
  END IF;
END;
$$;
