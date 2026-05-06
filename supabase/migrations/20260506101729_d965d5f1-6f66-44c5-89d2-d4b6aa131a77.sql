-- Palier 3 d'optimisation Cloud
-- 1. Re-fixer smart-followups à 1×/jour (a été reset à 6h)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'smart-followups-cron'),
  schedule := '0 9 * * *'
);

-- 2. Espacer visit-reminders : 15 min -> 30 min
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'send-visit-reminders-every-15-minutes'),
  schedule := '*/30 * * * *'
);

-- 3. Désactiver le cron quotidien doublon (la version mensuelle suffit)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'send-document-update-reminders-daily'),
  schedule := '0 7 1 * *'  -- une fois par mois (le 1er à 7h) au lieu de tous les jours
);