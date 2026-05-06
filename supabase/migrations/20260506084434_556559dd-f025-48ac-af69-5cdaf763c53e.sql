SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sync-imap-emails-every-15-minutes'),
  schedule := '*/30 * * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'phone-appointment-reminders-24h'),
  schedule := '0 * * * *'
);