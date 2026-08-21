CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  scope text NOT NULL,
  identity_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, identity_hash, window_start)
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.edge_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.edge_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_scope text,
  p_identity_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_scope IS NULL OR length(p_scope) < 1
     OR p_identity_hash IS NULL OR length(p_identity_hash) < 16
     OR p_window_seconds < 1 OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'invalid rate-limit parameters';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.edge_rate_limits(scope, identity_hash, window_start, request_count, updated_at)
  VALUES (p_scope, p_identity_hash, v_window_start, 1, now())
  ON CONFLICT (scope, identity_hash, window_start)
  DO UPDATE SET
    request_count = public.edge_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer)
  TO service_role;
