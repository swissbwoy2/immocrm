-- Allègement des tâches planifiées (déjà appliqué le 19.10.2026). Rien n'est supprimé : fréquences réduites ou tâches en pause.
-- Pour revenir en arrière : cron.alter_job(<id>, schedule := '<ancienne>') ou active := true.
DO $$
BEGIN
  PERFORM cron.alter_job(jobid, schedule := '*/5 5-19 * * *') FROM cron.job WHERE jobname = 'portal-visit-inbox-every-minute';      -- avant : chaque minute
  PERFORM cron.alter_job(jobid, schedule := '*/15 * * * *')   FROM cron.job WHERE jobname = 'newsletter-dispatch';                  -- avant : chaque minute
  PERFORM cron.alter_job(jobid, schedule := '*/15 * * * *')   FROM cron.job WHERE jobname = 'process-postulation-jobs-every-minute'; -- avant : chaque minute
  PERFORM cron.alter_job(jobid, schedule := '*/30 * * * *')   FROM cron.job WHERE jobname = 'extract-offre-images-every-5-min';      -- avant : */5
  PERFORM cron.alter_job(jobid, schedule := '*/30 * * * *')   FROM cron.job WHERE jobname = 'communication-tracking-sync';           -- avant : */10
  -- WhatsApp en pause tant que le compte Meta est bloqué (paiement) — doublons inclus
  PERFORM cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname IN (
    'wa-post-visite','wa-post-visite-tick','wa-google-review-j3','wa-google-review-daily',
    'wa-mandate-expiring-30d','wa-mandate-expiring-daily','wa-visit-reminder-daily');
END $$;
