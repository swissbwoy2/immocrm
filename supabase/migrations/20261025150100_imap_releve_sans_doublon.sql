-- Relève IMAP sans relève simultanée.
-- 'portal-visit-inbox-every-minute' relève info@immo-rama.ch toutes les 5 minutes de 5 h à 19 h (UTC).
-- 'sync-imap-emails-every-15-minutes' relève toutes les boîtes actives toutes les 30 minutes, jour et nuit :
-- aux minutes 0 et 30, les deux tâches lisaient la même boîte au même moment.
-- La relève de 30 minutes est décalée aux minutes 2 et 32 : même fréquence pour toutes les boîtes,
-- plus aucun passage simultané. Les e-mails déjà enregistrés ne sont plus relus (sync-all-imap-emails).
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'sync-imap-emails-every-15-minutes';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(v_jobid, schedule := '2,32 * * * *');
  END IF;
END;
$$;
