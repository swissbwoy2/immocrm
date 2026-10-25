-- Relève IMAP sans doublon.
-- 'portal-visit-inbox-every-minute' relève info@immo-rama.ch toutes les 5 minutes de 5 h à 19 h (UTC).
-- 'sync-imap-emails-every-15-minutes' relevait aussi toutes les boîtes toutes les 30 minutes, jour et nuit :
-- aux heures pleines et demies, les deux tâches lisaient la même boîte en même temps.
-- La relève de 30 minutes ne tourne plus que pendant la nuit, quand l'autre est à l'arrêt.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'sync-imap-emails-every-15-minutes';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(v_jobid, schedule := '*/30 0-4,20-23 * * *');
  END IF;
END;
$$;
