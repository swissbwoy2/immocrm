
-- 1) Fix duration default to 180 days for purchase mandates (6 months) and backfill old projects stuck at 60.
ALTER TABLE public.purchase_projects ALTER COLUMN duree_progression_jours SET DEFAULT 180;
UPDATE public.purchase_projects SET duree_progression_jours = 180 WHERE duree_progression_jours = 60 OR duree_progression_jours IS NULL;

-- 2) Backfill assigned_agent_id from clients.agent_id when missing, so the conseiller appears in dashboards.
UPDATE public.purchase_projects pp
SET assigned_agent_id = c.agent_id
FROM public.clients c
WHERE pp.client_id = c.id AND pp.assigned_agent_id IS NULL AND c.agent_id IS NOT NULL;

-- 3) Add co-acheteurs (jsonb array) for purchase projects.
ALTER TABLE public.purchase_projects ADD COLUMN IF NOT EXISTS co_acheteurs jsonb NOT NULL DEFAULT '[]'::jsonb;
