-- Idempotent backfill: one queued job per legacy offre souhaite_postuler without a job.
-- Skips clients without user_id; never touches existing jobs, offres or candidatures.
INSERT INTO public.postulation_jobs (offre_id, client_id, candidature_id, requested_by, status, next_attempt_at, idempotency_key)
SELECT o.id, o.client_id,
  (SELECT k.id FROM public.candidatures k WHERE k.offre_id = o.id AND k.client_id = o.client_id ORDER BY k.created_at DESC LIMIT 1),
  c.user_id, 'queued', now(),
  'legacy:' || o.id::text || ':' || o.client_id::text
FROM public.offres o
JOIN public.clients c ON c.id = o.client_id
WHERE o.statut = 'souhaite_postuler'
  AND c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.postulation_jobs j WHERE j.offre_id = o.id AND j.client_id = o.client_id)
ON CONFLICT DO NOTHING;