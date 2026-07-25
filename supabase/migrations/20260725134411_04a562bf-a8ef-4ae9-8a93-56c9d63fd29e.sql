
CREATE TABLE public.auto_offer_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  dry_run boolean NOT NULL DEFAULT true,
  clients_servis integer NOT NULL DEFAULT 0,
  listings_found integer NOT NULL DEFAULT 0,
  listings_retained integer NOT NULL DEFAULT 0,
  offers_created integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  clients_sous_objectif jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text,
  error text
);

GRANT SELECT ON public.auto_offer_runs TO authenticated;
GRANT ALL ON public.auto_offer_runs TO service_role;
ALTER TABLE public.auto_offer_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read auto_offer_runs" ON public.auto_offer_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.auto_offer_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.auto_offer_runs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'immobilier.ch',
  listing_url text,
  listing_external_id text,
  adresse text,
  npa text,
  ville text,
  pieces numeric,
  surface numeric,
  loyer_net numeric,
  charges numeric,
  loyer_cc numeric,
  regie text,
  score numeric,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  hard_budget_cap numeric,
  would_send boolean NOT NULL DEFAULT false,
  reason text,
  offer_id uuid REFERENCES public.offres(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auto_offer_candidates_run ON public.auto_offer_candidates(run_id);
CREATE INDEX idx_auto_offer_candidates_client ON public.auto_offer_candidates(client_id);
CREATE INDEX idx_auto_offer_candidates_score ON public.auto_offer_candidates(score DESC);

GRANT SELECT ON public.auto_offer_candidates TO authenticated;
GRANT ALL ON public.auto_offer_candidates TO service_role;
ALTER TABLE public.auto_offer_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read auto_offer_candidates" ON public.auto_offer_candidates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_config (key, value) VALUES
  ('auto_offers_enabled', 'false'),
  ('auto_offers_dry_run', 'true')
ON CONFLICT (key) DO NOTHING;
